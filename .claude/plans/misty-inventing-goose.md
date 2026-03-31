# Plano: Simplificar prompt de perguntas contextuais para processar uma necessidade de negócio por vez

## Contexto

O prompt `c01_analysis_contextual_questions_prompt.py` atualmente recebe **múltiplas** necessidades de negócio de uma só vez e solicita ao LLM que retorne um array de arrays com 3 perguntas para cada uma. Isso aumenta a complexidade da tarefa do LLM e reduz a assertividade das respostas.

A maioria das outras funções no `analysis.py` já segue o padrão "um item por vez + loop" (ex: `_synthesize_desired_behavior`, `_generate_whatif_questions`, `_identify_uncertainty_from_qa`). Vamos alinhar `_generate_contextual_questions` com esse padrão existente.

## Arquivos a modificar

1. **`backend/app/agent/prompts/c01_analysis_contextual_questions_prompt.py`** — simplificar o prompt
2. **`backend/app/agent/nodes/analysis.py`** — refatorar `_generate_contextual_questions` e `_task_generate_questions`

## Mudanças detalhadas

### 1. Prompt (`c01_analysis_contextual_questions_prompt.py`)

**Antes:** recebe `{business_needs}` (lista) e `{quantity}`, retorna `[["P1","P2","P3"], ["P1","P2","P3"]]`

**Depois:** recebe `{business_need}` (singular), sem `{quantity}`, retorna `["P1", "P2", "P3"]`

```python
ANALYSIS_CONTEXTUAL_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em elicitação e refinamento de requisitos.

Dada a necessidade de negócio abaixo, gere exatamente 3 perguntas contextuais que ajudem a esclarecer, detalhar e refinar o comportamento desejado do sistema. As perguntas devem explorar aspectos como: escopo funcional, restrições, regras de negócio, critérios de aceitação e expectativas do stakeholder.

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}

Necessidade de negócio:
{business_need}

Você DEVE retornar APENAS um array JSON válido (sem markdown, sem explicação) contendo exatamente 3 strings, cada uma sendo uma pergunta contextual concisa (até 250 caracteres).

Exemplo de formato de resposta:
["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"]

IMPORTANTE:
- Sua resposta DEVE estar no idioma: {language}.
- NÃO use aspas duplas dentro do texto das perguntas. Se precisar citar algo, use aspas simples.
- Retorne SOMENTE o array JSON, sem nenhum texto antes ou depois.
""",
}
```

### 2. Função `_generate_contextual_questions` (`analysis.py`)

**Antes:** recebe `DataContext`, extrai todas as necessidades, faz 1 chamada ao LLM, retorna `List[List[str]]`

**Depois:** recebe um único `ConjecturalData` + `DataContext`, faz 1 chamada ao LLM, retorna `List[str]` (3 perguntas)

Seguir o padrão de `_generate_whatif_questions` (linha 150) que já funciona assim:

```python
async def _generate_contextual_questions(
    cd: "ConjecturalData",
    data_context: DataContext,
    model_provider: str,
) -> List[str]:
    """Call the LLM to generate 3 contextual questions for a single business need."""
    prompt = get_prompt(ANALYSIS_CONTEXTUAL_QUESTIONS_PROMPT, data_context.language).format(
        business_need=cd.raw_business_need,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        business_objective=data_context.business_objective,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        raw_content = _strip_markdown_fences(extract_text(response.content).strip())
        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            fixed = re.sub(r'(?<=\w)"(?=\w)', "'", raw_content)
            return json.loads(fixed)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Analysis] Error generating contextual questions: {e}")
        return ["Unable to generate question."] * 3
```

### 3. Função `_task_generate_questions` (`analysis.py`)

**Antes:** chama `_generate_contextual_questions(data_context, model_provider)` uma vez e itera o resultado

**Depois:** faz loop sobre cada `conjectural_data`, chamando a função unitária (igual ao padrão de `_task_synthesize_and_generate_whatif`, linha 242):

```python
async def _task_generate_questions(...) -> dict:
    print(f"[Analysis] Elicitation context loaded — {len(data_context.conjectural_data)} business need(s)")

    for idx, cd in enumerate(data_context.conjectural_data, start=1):
        questions = await _generate_contextual_questions(cd, data_context, model_provider)
        cd.raw_desired_behavior_questions_answers = [
            QuestionAnswer(question=q) for q in questions
        ]
        for q in questions:
            print(f"  [Questions] Business Need [{idx}]: {q}")

    print("[Analysis] Questions generated — routing to Elicitation for answers")
    return {
        "data_context": data_context.model_dump(),
        "coordinator_phase": "elicitation",
        "node_task": "elicitation:answer_questions",
    }
```

## Resumo das mudanças

| O que muda | Antes | Depois |
|---|---|---|
| Prompt | Recebe N necessidades, retorna `[[...], [...]]` | Recebe 1 necessidade, retorna `[...]` |
| `_generate_contextual_questions` | Recebe `DataContext`, 1 chamada LLM | Recebe `ConjecturalData`, 1 chamada LLM por necessidade |
| `_task_generate_questions` | Chama função 1 vez, itera resultado | Loop com 1 chamada por `ConjecturalData` |
| Fallback de erro | `[["..."] * 3] * len(impacts)` | `["..."] * 3` |

## Verificação

1. Rodar `pnpm dev` e testar o fluxo completo de geração de requisitos conjecturais
2. Verificar nos logs do terminal que `[Questions] Business Need [N]` aparece para cada necessidade de negócio
3. Confirmar que as perguntas são atribuídas corretamente a cada `ConjecturalData` no estado
