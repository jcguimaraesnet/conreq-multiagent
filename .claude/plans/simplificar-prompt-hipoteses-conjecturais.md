# Plano: Simplificar prompt de hipóteses conjecturais para processar um par por vez

## Contexto

O prompt `c05_analysis_conjectural_hypothesis_prompt.py` atualmente recebe **múltiplos pares** de impacto positivo + incerteza de uma só vez e solicita ao LLM que retorne um array com N hipóteses. Isso aumenta a complexidade da tarefa do LLM e reduz a assertividade.

A maioria das funções no `analysis.py` já segue o padrão "um item por vez + loop" (`_identify_uncertainty_from_qa`, `_generate_whatif_questions`, `_synthesize_desired_behavior`, `_generate_contextual_questions`). `_generate_conjectural_hypotheses` é a **última função batch** restante. Vamos alinhá-la com o padrão existente.

## Arquivos a modificar

1. **`backend/app/agent/prompts/c05_analysis_conjectural_hypothesis_prompt.py`** — simplificar o prompt
2. **`backend/app/agent/nodes/analysis.py`** — refatorar `_generate_conjectural_hypotheses` e o trecho da `_task_identify_uncertainty_and_continue` que a chama

## Mudanças detalhadas

### 1. Prompt (`c05_analysis_conjectural_hypothesis_prompt.py`)

**Antes:** recebe `{impacts_and_uncertainties}` (lista de pares) e `{quantity}`, retorna `["H1", "H2", ...]`

**Depois:** recebe `{business_need}` (singular) e `{uncertainty}` (singular), sem `{quantity}`, retorna uma **string pura** (a hipótese, sem JSON)

O novo prompt segue a mesma estrutura padronizada com seções `# Instrução`, `# Contexto`, `## Diretrizes` usada nos outros prompts já reformulados pelo usuário:

```python
ANALYSIS_CONJECTURAL_HYPOTHESIS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em experimentação lean e desenvolvimento orientado a hipóteses.

# Instrução
Com base nas informações de contexto abaixo, proponha UMA hipótese de experimento — uma suposição de solução verificável e testável que, se validada, eliminaria (ou reduziria significativamente) a incerteza e ajudaria a alcançar o impacto positivo desejado.

# Contexto

## Visão do projeto
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

## Principal Stakeholder
{stakeholder}

## Necessidade de negócio (impacto positivo desejado)
{business_need}

## Incerteza associada
{uncertainty}

## Diretrizes para elaborar a hipótese
- A hipótese deve ser verificável: pode ser testada com um experimento concreto
- A hipótese deve ser mensurável: possui critérios claros de sucesso/falha
- A hipótese deve ser focada: aborda diretamente a incerteza
- A hipótese deve ser acionável: descreve o que construir, testar ou medir

## Restrições textuais e formato da resposta
- Retorne APENAS o texto da hipótese, sem nenhuma explicação adicional, sem JSON, sem markdown
- A hipótese deve ter até 300 caracteres
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}
""",
}
```

**Nota:** como o retorno é uma única string (não um array JSON), o formato fica mais simples — texto puro, sem necessidade de parsing JSON. Isso segue o mesmo padrão de `_identify_uncertainty_from_qa` que também retorna texto puro.

### 2. Função `_generate_conjectural_hypotheses` (`analysis.py`, linhas 75-109)

**Antes:** recebe `DataContext`, extrai todos os pares, faz 1 chamada LLM, retorna `List[str]`

**Depois:** recebe um único `ConjecturalData` + `DataContext`, faz 1 chamada LLM, retorna `str` (uma hipótese)

Seguir o padrão de `_identify_uncertainty_from_qa` (linha 171) que já funciona assim:

```python
async def _generate_conjectural_hypothesis(
    cd: "ConjecturalData",
    data_context: DataContext,
    model_provider: str,
) -> str:
    """Call the LLM to generate a verifiable experiment hypothesis for a single business need + uncertainty pair."""
    prompt = get_prompt(ANALYSIS_CONJECTURAL_HYPOTHESIS_PROMPT, data_context.language).format(
        business_need=cd.raw_business_need,
        uncertainty=cd.raw_uncertainty,
        project_summary=data_context.project_summary,
        domain=data_context.domain,
        stakeholder=data_context.stakeholder,
        business_objective=data_context.business_objective,
        language=data_context.language,
    )

    model = get_model(provider=model_provider, temperature=0)

    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        return extract_text(response.content).strip()
    except Exception as e:
        print(f"[Analysis] Error generating conjectural hypothesis: {e}")
        return "Unable to generate hypothesis."
```

**Mudanças-chave:**
- Nome no singular: `_generate_conjectural_hypothesis` (sem "s")
- Assinatura: `(cd, data_context, model_provider)` ao invés de `(data_context, model_provider)`
- Retorno: `str` ao invés de `List[str]`
- Sem parsing JSON — retorna texto puro (como `_identify_uncertainty_from_qa`)
- Fallback: string única ao invés de lista

### 3. Trecho da `_task_identify_uncertainty_and_continue` (`analysis.py`, linhas 268-272)

**Antes:** chamada batch + zip para atribuir:
```python
hypotheses_list = await _generate_conjectural_hypotheses(data_context, model_provider)
for cd, hypothesis in zip(data_context.conjectural_data, hypotheses_list):
    cd.raw_supposition_solution = hypothesis
    print(f"  [Hypothesis] {cd.raw_business_need!r} → {hypothesis!r}")
```

**Depois:** loop individual (mesmo padrão das linhas 264-266 logo acima):
```python
for idx, cd in enumerate(data_context.conjectural_data, start=1):
    cd.raw_supposition_solution = await _generate_conjectural_hypothesis(cd, data_context, model_provider)
    print(f"  [Hypothesis] Impact [{idx}]: {cd.raw_supposition_solution!r}")
```

## Resumo das mudanças

| O que muda | Antes | Depois |
|---|---|---|
| Prompt | Recebe N pares, retorna array JSON | Recebe 1 par, retorna texto puro |
| Função | `_generate_conjectural_hypotheses(data_context, ...)` → `List[str]` | `_generate_conjectural_hypothesis(cd, data_context, ...)` → `str` |
| Chamada na task | 1 chamada batch + zip | Loop com 1 chamada por `ConjecturalData` |
| Parsing | `json.loads(raw_content)` | `extract_text(response.content).strip()` (texto puro) |
| Fallback | `["..."] * len(impacts)` | `"..."` (string única) |

## Verificação

1. Rodar `pnpm dev` e testar o fluxo completo de geração de requisitos conjecturais
2. Verificar nos logs do terminal que `[Hypothesis] Impact [N]` aparece para cada necessidade de negócio
3. Confirmar que `raw_supposition_solution` é preenchido corretamente em cada `ConjecturalData`
