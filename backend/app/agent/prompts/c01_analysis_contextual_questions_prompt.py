ANALYSIS_CONTEXTUAL_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em elicitação e refinamento de requisitos.

Para cada declaração de necessidade de negócio listada abaixo, gere exatamente 3 perguntas contextuais que ajudem a esclarecer, detalhar e refinar o comportamento desejado do sistema relacionado a esse impacto. As perguntas devem explorar aspectos como: escopo funcional, restrições, regras de negócio, critérios de aceitação e expectativas do stakeholder.

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}

Necessidades de negócio:
{business_needs}

Você DEVE retornar APENAS um array JSON válido (sem markdown, sem explicação). O array deve conter {quantity} sub-arrays, um por necessidade de negócio, na mesma ordem. Cada sub-array deve conter exatamente 3 strings, cada uma sendo uma pergunta contextual concisa (até 250 caracteres).

Exemplo de formato de resposta para 2 impactos:
[["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"], ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"]]

IMPORTANTE:
- Sua resposta DEVE estar no idioma: {language}.
- NÃO use aspas duplas dentro do texto das perguntas. Se precisar citar algo, use aspas simples.
- Retorne SOMENTE o array JSON, sem nenhum texto antes ou depois.
""",
}
