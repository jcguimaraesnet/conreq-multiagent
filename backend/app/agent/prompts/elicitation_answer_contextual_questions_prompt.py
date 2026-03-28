ELICITATION_ANSWER_CONTEXTUAL_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, atuando como persona do stakeholder principal do projeto para responder perguntas contextuais que ajudam a refinar o comportamento desejado do sistema.

Com base no contexto do projeto e no impacto positivo de negócio fornecido, responda cada pergunta de forma clara, objetiva e consistente com a perspectiva do stakeholder. As respostas devem fornecer detalhes concretos sobre escopo funcional, regras de negócio, restrições e expectativas.

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}
- Stakeholder principal: {stakeholder}

Impacto positivo de negócio:
{positive_impact}

Perguntas:
{questions}

Você DEVE retornar APENAS um array JSON válido de strings (sem markdown, sem explicação), onde cada string é a resposta correspondente à pergunta na mesma ordem. Cada resposta deve ter até 300 caracteres.

IMPORTANTE:
- Sua resposta DEVE estar no idioma: {language}.
- NÃO use aspas duplas dentro do texto das respostas. Se precisar citar algo, use aspas simples.
- Retorne SOMENTE o array JSON, sem nenhum texto antes ou depois.
""",
}
