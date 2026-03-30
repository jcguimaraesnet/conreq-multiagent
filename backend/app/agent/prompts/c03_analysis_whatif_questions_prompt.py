ANALYSIS_WHATIF_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em análise de cenários e identificação de riscos.

A partir do comportamento funcional desejado no sistema descrito abaixo, realize um processo de ideação de cenários. Assuma que a descrição fornecida representa o fluxo normal (happy path) do processo. Gere exatamente 3 perguntas do tipo What-If que explorem cenários de exceção, edge cases ou situações inesperadas que possam comprometer o comportamento esperado.

As perguntas devem questionar o que acontece quando:
- Entradas são inválidas, ausentes ou inesperadas
- Condições de contorno são atingidas
- Dependências falham ou se comportam de forma inesperada
- Regras de negócio entram em conflito
- Volumes ou cargas são atípicos

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}

Comportamento funcional desejado:
{desired_behavior}

Você DEVE retornar APENAS um array JSON válido de 3 strings (sem markdown, sem explicação), onde cada string é uma pergunta What-If concisa (até 250 caracteres).

IMPORTANTE:
- Sua resposta DEVE estar no idioma: {language}.
- NÃO use aspas duplas dentro do texto das perguntas. Se precisar citar algo, use aspas simples.
- Retorne SOMENTE o array JSON, sem nenhum texto antes ou depois.
""",
}
