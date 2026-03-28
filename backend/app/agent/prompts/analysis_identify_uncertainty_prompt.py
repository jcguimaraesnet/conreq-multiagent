ANALYSIS_IDENTIFY_UNCERTAINTY_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em análise de riscos e incertezas.

Com base no comportamento funcional desejado, nas perguntas What-If e suas respostas, e nas lacunas identificadas (questões não respondidas ou respostas vagas), identifique exatamente UMA incerteza-chave — o aspecto mais crítico que é pouco claro, subespecificado ou que pode impedir o comportamento desejado de ser alcançado.

Foque em:
- Lacunas de conhecimento reveladas pelas perguntas não respondidas
- Suposições não validadas nas respostas
- Conflitos entre cenários de exceção e o fluxo normal
- Restrições ausentes ou ambíguas

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}

Comportamento funcional desejado:
{desired_behavior}

Perguntas What-If e respostas:
{questions_answers}

Você DEVE retornar APENAS uma string com a descrição concisa da incerteza-chave identificada (até 200 caracteres). Sem markdown, sem explicação, sem aspas ao redor.

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
