"""
Persistence service for conjectural requirements and evaluations.

Saves DataContext conjectural data to the database and writes back
the generated UUIDs into the in-memory models.
"""

import re

from app.agent.models.data_context import DataContext, ConjecturalData, ConjecturalRequirement, Evaluation
from app.services.supabase_client import get_supabase_client
from app.services.embedding_service import generate_embeddings_sync


def _get_next_requirement_number(supabase, project_id: str) -> int:
    """Query the highest REQ-C number for a project and return the next one."""
    result = supabase.table("conjectural_requirements") \
        .select("requirement_id") \
        .eq("project_id", project_id) \
        .not_.is_("requirement_id", "null") \
        .order("requirement_id", desc=True) \
        .limit(1) \
        .execute()

    if not result.data or not result.data[0].get("requirement_id"):
        return 1

    match = re.search(r"REQ-C(\d+)", result.data[0]["requirement_id"])
    return int(match.group(1)) + 1 if match else 1


def _build_history_snapshot(cd: ConjecturalData) -> list[dict]:
    """Build a JSON-serializable history snapshot with all attempts and evaluations."""
    snapshot = []
    for cr in cd.conjectural_requirements:
        entry = {
            "attempt": cr.attempt,
            "ranking": cr.ranking,
            "ferc": {
                "desired_behavior": cr.ferc.desired_behavior,
                "positive_impact": cr.ferc.positive_impact,
                "uncertainties": list(cr.ferc.uncertainties),
            },
            "qess": {
                "solution_assumption": cr.qess.solution_assumption,
                "uncertainty_evaluated": cr.qess.uncertainty_evaluated,
                "observation_analysis": cr.qess.observation_analysis,
            },
            "evaluations": [],
        }
        if cr.llm_evaluation and cr.llm_evaluation.scores:
            entry["evaluations"].append({
                "type": "llm",
                "scores": cr.llm_evaluation.scores,
                "justifications": cr.llm_evaluation.justifications,
                "overall_score": cr.llm_evaluation.overall_score,
            })
        if cr.human_evaluation and cr.human_evaluation.scores:
            entry["evaluations"].append({
                "type": "human",
                "scores": cr.human_evaluation.scores,
                "justifications": cr.human_evaluation.justifications,
                "overall_score": cr.human_evaluation.overall_score,
            })
        snapshot.append(entry)
    return snapshot


def _build_requirement_snapshot(cr: ConjecturalRequirement) -> dict:
    """Build a JSON snapshot of a conjectural requirement for the evaluation row."""
    return {
        "attempt": cr.attempt,
        "ranking": cr.ranking,
        "ferc": {
            "desired_behavior": cr.ferc.desired_behavior,
            "positive_impact": cr.ferc.positive_impact,
            "uncertainties": list(cr.ferc.uncertainties),
        },
        "qess": {
            "solution_assumption": cr.qess.solution_assumption,
            "uncertainty_evaluated": cr.qess.uncertainty_evaluated,
            "observation_analysis": cr.qess.observation_analysis,
        },
    }


def _build_requirement_row(project_id: str, cr: ConjecturalRequirement, requirement_id: str, user_id: str | None = None) -> dict:
    """Build a database row dict from a ConjecturalRequirement (ranking=1 only)."""
    row = {
        "project_id": project_id,
        "requirement_id": requirement_id,
        "status": "todo",
        "desired_behavior": cr.ferc.desired_behavior,
        "positive_impact": cr.ferc.positive_impact,
        "uncertainties": list(cr.ferc.uncertainties),
        "solution_assumption": cr.qess.solution_assumption,
        "uncertainty_evaluated": cr.qess.uncertainty_evaluated,
        "observation_analysis": cr.qess.observation_analysis,
    }
    if user_id:
        row["user_id"] = user_id
    return row


def _build_evaluation_row(
    requirement_db_id: str,
    eval_type: str,
    evaluation: Evaluation,
    attempt: int,
    ranking: int | None,
    requirement_snapshot: dict,
) -> dict:
    """Build a database row dict from an Evaluation."""
    return {
        "requirement_id": requirement_db_id,
        "type": eval_type,
        "attempt": attempt,
        "ranking": ranking,
        "unambiguous": evaluation.scores.get("unambiguous", 1),
        "completeness": evaluation.scores.get("completeness", 1),
        "atomicity": evaluation.scores.get("atomicity", 1),
        "verifiable": evaluation.scores.get("verifiable", 1),
        "conforming": evaluation.scores.get("conforming", 1),
        "justifications": evaluation.justifications,
        "requirement_snapshot": requirement_snapshot,
    }


def persist_conjectural_data(project_id: str, data_context: DataContext, user_id: str | None = None) -> list[str]:
    """Persist conjectural requirements and evaluations to the database.

    Only ranking=1 requirements are inserted into conjectural_requirements.
    All evaluations (from all attempts) are linked to the winning requirement's ID.
    """
    supabase = get_supabase_client()

    # Get the next available REQ-C number for this project
    next_number = _get_next_requirement_number(supabase, project_id)
    requirement_ids: list[str] = []

    for cd in data_context.conjectural_data:
        # Build history snapshot once per group
        history_snapshot = _build_history_snapshot(cd)

        # Find the winner (ranking=1)
        winner = next((cr for cr in cd.conjectural_requirements if cr.ranking == 1), None)
        if not winner:
            print(f"[Persistence] No ranking=1 found, skipping")
            continue

        # Generate business identifier
        req_id = f"REQ-C{next_number:03d}"
        next_number += 1
        requirement_ids.append(req_id)

        # Insert only the winning requirement
        row = _build_requirement_row(project_id, winner, req_id, user_id)
        row["history_snapshot"] = history_snapshot

        # Generate and store embedding for the positive_impact
        try:
            embeddings = generate_embeddings_sync([winner.ferc.positive_impact])
            if embeddings:
                row["positive_impact_embedding"] = embeddings[0]
                print(f"[Persistence] Generated embedding for {req_id} positive_impact")
        except Exception as e:
            print(f"[Persistence] Error generating embedding for {req_id}: {e}")

        result = supabase.table("conjectural_requirements").insert(row).execute()

        if not result.data:
            print(f"[Persistence] Failed to insert requirement {req_id}")
            continue

        db_id = result.data[0]["id"]
        winner.db_id = db_id
        print(f"[Persistence] Saved requirement {req_id} → {db_id}")

        # Insert evaluations from ALL attempts, linked to the winner's db_id
        eval_rows = []
        for cr in cd.conjectural_requirements:
            cr_snapshot = _build_requirement_snapshot(cr)
            if cr.llm_evaluation and cr.llm_evaluation.scores:
                eval_rows.append(_build_evaluation_row(
                    db_id, "llm", cr.llm_evaluation, cr.attempt, cr.ranking, cr_snapshot,
                ))
            if cr.human_evaluation and cr.human_evaluation.scores:
                eval_rows.append(_build_evaluation_row(
                    db_id, "human", cr.human_evaluation, cr.attempt, cr.ranking, cr_snapshot,
                ))

        if eval_rows:
            supabase.table("evaluations").insert(eval_rows).execute()
            print(f"[Persistence] Saved {len(eval_rows)} evaluation(s) for requirement {db_id}")

    return requirement_ids
