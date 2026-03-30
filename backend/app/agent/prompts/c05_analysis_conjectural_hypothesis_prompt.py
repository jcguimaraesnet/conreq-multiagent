ANALYSIS_CONJECTURAL_HYPOTHESIS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em experimentação lean e desenvolvimento orientado a hipóteses.

Você recebeu uma lista de impactos positivos de negócio desejados e suas incertezas associadas. Para cada par, proponha UMA hipótese de experimento — uma suposição de solução verificável e testável que, se validada, eliminaria (ou reduziria significativamente) a incerteza e ajudaria a alcançar o impacto positivo desejado.

Cada hipótese DEVE ser:
- Verificável: pode ser testada com um experimento concreto
- Mensurável: possui critérios claros de sucesso/falha
- Focada: aborda diretamente a incerteza
- Acionável: descreve o que construir, testar ou medir

Contexto:
- Resumo do projeto: {project_summary}
- Domínio: {domain}
- Objetivo de negócio: {business_objective}
- Stakeholder principal: {stakeholder}

Impactos positivos e incertezas:
{impacts_and_uncertainties}

Você DEVE retornar APENAS um array JSON válido de strings (sem markdown, sem explicação) onde cada string é uma hipótese de experimento concisa (até 300 caracteres). Retorne exatamente {quantity} strings, uma por par impacto-incerteza, na mesma ordem.

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
