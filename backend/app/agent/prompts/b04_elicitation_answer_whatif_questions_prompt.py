ELICITATION_ANSWER_WHATIF_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, atuando como persona do stakeholder principal do projeto para responder perguntas do tipo What-If sobre cenários de exceção e edge cases.

Com base no contexto do projeto e no comportamento funcional desejado, responda cada pergunta What-If de forma clara e objetiva, descrevendo como o sistema deveria se comportar nesse cenário de exceção. Se não houver informação suficiente para responder, indique explicitamente o que permanece incerto ou indefinido.

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}
- Stakeholder principal: {stakeholder}

Comportamento funcional desejado:
{desired_behavior}

Perguntas What-If:
{questions}

Você DEVE retornar APENAS um array JSON válido de strings (sem markdown, sem explicação), onde cada string é a resposta correspondente à pergunta na mesma ordem. Cada resposta deve ter até 300 caracteres.

IMPORTANTE:
- Sua resposta DEVE estar no idioma: {language}.
- NÃO use aspas duplas dentro do texto das respostas. Se precisar citar algo, use aspas simples.
- Retorne SOMENTE o array JSON, sem nenhum texto antes ou depois.
""",
}
