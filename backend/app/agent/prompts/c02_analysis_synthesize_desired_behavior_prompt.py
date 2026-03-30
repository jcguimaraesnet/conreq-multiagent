ANALYSIS_SYNTHESIZE_DESIRED_BEHAVIOR_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco na formulação de comportamentos funcionais desejados.

Com base no necessidade de negócio e nos pares de perguntas e respostas contextuais fornecidos abaixo, sintetize uma declaração clara e concisa do comportamento funcional desejado no sistema. A declaração deve descrever O QUE o sistema deve fazer (não como), de forma verificável e sem ambiguidade.

Contexto:
- Visão do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}

Necessidade de negócio:
{business_need}

Perguntas e respostas contextuais:
{questions_answers}

Você DEVE retornar APENAS uma string com a declaração do comportamento funcional desejado (até 500 caracteres). Sem markdown, sem explicação, sem aspas ao redor.

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
