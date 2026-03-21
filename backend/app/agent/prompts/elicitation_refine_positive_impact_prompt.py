ELICITATION_REFINE_POSITIVE_IMPACT_PROMPT = {
    "en": """You are a requirements engineer specializing in elicitation.

# Instruction

You have received a set of initial descriptions of desired positive business impacts, provided by a stakeholder.
For each initial description of a desired positive business impact, produce a refined sentence of that initial description to be used later in a software requirement specification.
Consider the guidelines and project context below to produce the refined sentences.

## Guidelines on how to elaborate positive business impact statements
- Must preserve the original intent of the initial description
- Must be short, concise, and unique, avoiding conjunctions like "and" or "or" or "," that indicate multiple impacts in a single statement
- Must add specificity and clarity using the project context
- Must represent a distinct benefit or value to be achieved in the business

## Project context:
- Domain: {domain}
- Primary stakeholder: {stakeholder}
- Business objective: {business_objective}
- Project summary: {project_summary}

## Initial descriptions:
{brief_descriptions}

## About the response format
You MUST return ONLY a valid JSON array (no markdown, no explanation) with exactly {quantity} strings, each being a refined sentence of the initial description, in the same order.
""",
    "pt-br": """Você é um engenheiro de requisitos especializado em elicitação.

# Instrução

Você recebeu um conjunto de descrições iniciais de impactos positivos desejados no negócio, fornecidas por um stakeholder.
Para cada descrição inicial de impacto positivo desejado no negócio, produza uma sentença refinada dessa descrição inicial para ser usada futuramente em uma especificação de requisito de software.
Considere as diretrizes e o contexto do projeto abaixo para produzir as sentenças refinadas.

## Diretrizes sobre como elaborar declarações de impacto positivo de negócio
- Deve preservar a intenção original da descrição inicial
- Deve ser curta, concisa e única, evitando conjunções como "e" ou "ou" ou "," que indiquem múltiplos impactos em uma única declaração
- Deve adicionar especificidade e clareza usando o contexto do projeto
- Deve representar um benefício ou valor distinto a ser alcançado no negócio

## Contexto do projeto:
- Domínio: {domain}
- Stakeholder principal: {stakeholder}
- Objetivo de negócio: {business_objective}
- Resumo do projeto: {project_summary}

## Descrições iniciais:
{brief_descriptions}

## Sobre o formato de resposta
Você DEVE retornar APENAS um array JSON válido (sem markdown, sem explicação) com exatamente {quantity} strings, cada uma sendo uma sentença refinada da descrição inicial, na mesma ordem.
""",
}
