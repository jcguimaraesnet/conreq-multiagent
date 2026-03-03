"""
NLP Domain Entity Extractor

Extracts domain entities from project vision text using
spaCy NER + TF-IDF (scikit-learn).
"""

import asyncio
import re
from typing import Optional

import spacy
from sklearn.feature_extraction.text import TfidfVectorizer


# Cache loaded models to avoid reloading on every call
_loaded_models: dict[str, spacy.language.Language] = {}

SPACY_MODELS = {
    "pt": "pt_core_news_md",
    "en": "en_core_web_sm",
}

# NER labels relevant for domain entity extraction
RELEVANT_NER_LABELS = {"ORG", "PRODUCT", "MISC", "LOC", "WORK_OF_ART", "EVENT", "LAW"}

# POS tags to keep for TF-IDF candidate terms
NOUN_POS_TAGS = {"NOUN", "PROPN"}

# Minimum token length for TF-IDF candidates
MIN_TOKEN_LENGTH = 3

# Max number of TF-IDF terms to extract
TFIDF_TOP_N = 30


def _load_spacy_model(language: str = "pt") -> spacy.language.Language:
    """Load and cache a spaCy model by language code."""
    model_name = SPACY_MODELS.get(language, SPACY_MODELS["pt"])

    if model_name not in _loaded_models:
        try:
            _loaded_models[model_name] = spacy.load(model_name)
        except OSError:
            raise RuntimeError(
                f"spaCy model '{model_name}' not found. "
                f"Install it with: python -m spacy download {model_name}"
            )

    return _loaded_models[model_name]


def _extract_ner_entities(doc: spacy.tokens.Doc) -> list[str]:
    """Extract named entities from a spaCy Doc, filtering by relevant labels."""
    entities = []
    for ent in doc.ents:
        if ent.label_ in RELEVANT_NER_LABELS:
            text = ent.text.strip()
            if len(text) >= MIN_TOKEN_LENGTH:
                entities.append(text)
    return entities


def _extract_noun_chunks(doc: spacy.tokens.Doc) -> list[str]:
    """Extract noun chunks (compound nouns) as domain term candidates."""
    chunks = []
    for chunk in doc.noun_chunks:
        # Keep only nouns/proper nouns, stripping determiners and auxiliaries
        tokens = [t for t in chunk if t.pos_ in NOUN_POS_TAGS and not t.is_stop]
        if tokens:
            text = " ".join(t.text for t in tokens).strip()
            if len(text) >= MIN_TOKEN_LENGTH:
                chunks.append(text)
    return chunks


def _extract_tfidf_terms(text: str, nlp: spacy.language.Language, top_n: int = TFIDF_TOP_N) -> list[str]:
    """Extract top domain terms using TF-IDF on sentence-level documents.

    Splits the vision text into sentences, computes TF-IDF, and returns
    the highest-scoring terms (nouns/proper nouns only).
    """
    doc = nlp(text)

    # Build sentence-level documents with only nouns for cleaner TF-IDF
    sentences: list[str] = []
    for sent in doc.sents:
        noun_tokens = [
            token.lemma_.lower()
            for token in sent
            if token.pos_ in NOUN_POS_TAGS
            and not token.is_stop
            and len(token.text) >= MIN_TOKEN_LENGTH
        ]
        if noun_tokens:
            sentences.append(" ".join(noun_tokens))

    if not sentences:
        return []

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=500,
        min_df=1,
        max_df=0.95,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(sentences)
    except ValueError:
        return []

    feature_names = vectorizer.get_feature_names_out()

    # Sum TF-IDF scores across all sentences for each term
    scores = tfidf_matrix.sum(axis=0).A1
    ranked_indices = scores.argsort()[::-1][:top_n]

    return [feature_names[i] for i in ranked_indices if scores[i] > 0]


def _normalize_and_deduplicate(entities: list[str]) -> list[str]:
    """Normalize entity text and remove duplicates (case-insensitive)."""
    seen: set[str] = set()
    result: list[str] = []

    for entity in entities:
        # Normalize whitespace
        normalized = re.sub(r"\s+", " ", entity).strip()
        key = normalized.lower()

        if key and key not in seen:
            seen.add(key)
            result.append(normalized)

    return result


def _extract_entities_sync(text: str, language: str = "pt") -> list[str]:
    """Synchronous pipeline: spaCy NER + noun chunks + TF-IDF, merged and deduplicated."""
    nlp = _load_spacy_model(language)
    doc = nlp(text)

    # 1. spaCy NER entities
    ner_entities = _extract_ner_entities(doc)

    # 2. Noun chunks (compound domain terms)
    noun_chunks = _extract_noun_chunks(doc)

    # 3. TF-IDF top terms
    tfidf_terms = _extract_tfidf_terms(text, nlp)

    # Merge: NER first (higher confidence), then noun chunks, then TF-IDF
    all_entities = ner_entities + noun_chunks + tfidf_terms

    return _normalize_and_deduplicate(all_entities)


def _find_matching_entity(span_text: str, entity_lookup: dict[str, str]) -> str | None:
    """Find a known entity that matches the span (case-insensitive substring)."""
    span_lower = span_text.lower().strip()
    if not span_lower:
        return None

    # Exact match first
    if span_lower in entity_lookup:
        return entity_lookup[span_lower]

    # Substring match: check if any entity is contained in the span or vice-versa
    for key, original in entity_lookup.items():
        if key in span_lower or span_lower in key:
            return original

    return None


def _extract_relations_sync(
    text: str,
    entity_names: set[str],
    language: str = "pt",
) -> list[dict[str, str]]:
    """Extract relations between known entities using textacy SVO triples.

    Uses textacy's subject_verb_object_triples for robust extraction that
    handles passive voice, compound subjects/objects, and subordinate clauses.
    Matches extracted subjects and objects against known domain entities.

    Returns list of {"source": ..., "target": ..., "relation": ...}.
    """
    import textacy.extract.triples

    nlp = _load_spacy_model(language)
    doc = nlp(text)

    # Build lowercase lookup: lowercase -> original name
    entity_lookup: dict[str, str] = {name.lower(): name for name in entity_names}

    seen_relations: set[tuple[str, str, str]] = set()
    relations: list[dict[str, str]] = []

    for triple in textacy.extract.triples.subject_verb_object_triples(doc):
        # Each triple has .subject, .verb, .object as lists of spaCy tokens
        subj_text = " ".join(t.text for t in triple.subject).strip()
        verb_text = " ".join(t.lemma_.lower() for t in triple.verb).strip()
        obj_text = " ".join(t.text for t in triple.object).strip()

        source_entity = _find_matching_entity(subj_text, entity_lookup)
        target_entity = _find_matching_entity(obj_text, entity_lookup)

        if not source_entity or not target_entity or source_entity == target_entity:
            continue

        key = (source_entity, target_entity, verb_text)
        if key not in seen_relations:
            seen_relations.add(key)
            relations.append({
                "source": source_entity,
                "target": target_entity,
                "relation": verb_text,
            })

    return relations


async def extract_entity_relations(
    text: Optional[str],
    entity_names: set[str],
    language: str = "pt",
) -> list[dict[str, str]]:
    """Extract relations between domain entities using spaCy dependency parsing.

    Runs in a separate thread to avoid blocking the async event loop.

    Args:
        text: The project vision or requirements text.
        entity_names: Set of known entity names to match against.
        language: Language code ("pt" for Portuguese, "en" for English).

    Returns:
        List of {"source": ..., "target": ..., "relation": ...} dicts.
    """
    if not text or not text.strip() or len(entity_names) < 2:
        return []

    return await asyncio.to_thread(_extract_relations_sync, text, entity_names, language)


async def extract_domain_entities(text: Optional[str], language: str = "pt") -> list[str]:
    """Extract domain entities from project vision text using NLP.

    Uses spaCy NER for named entities and TF-IDF for domain-relevant terms.
    Runs in a separate thread to avoid blocking the async event loop.

    Args:
        text: The project vision extracted text.
        language: Language code ("pt" for Portuguese, "en" for English).

    Returns:
        List of unique domain entity strings.
    """
    if not text or not text.strip():
        return []

    return await asyncio.to_thread(_extract_entities_sync, text, language)
