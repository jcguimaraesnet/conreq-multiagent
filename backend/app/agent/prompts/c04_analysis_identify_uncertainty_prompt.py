ANALYSIS_IDENTIFY_UNCERTAINTY_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco em análise de riscos e incertezas.

# Instrução
Com base nas informações de contexto abaixo, elabore uma declaração de incerteza.

# Contexto:

## Visão do projeto: 
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

## Necessidade de negócio
{business_need}

## Comportamento desejado
{desired_behavior}

## Perguntas de cenários What-If e suas respectivas respostas (sobre o comportamento desejado)
{questions_answers}

## Diretrizes para elaboração da declaração de incerteza
- Deve estar relacionado a um aspecto específico do comportamento desejado
- Deve ser formulada como um aspecto específico que é pouco claro, subespecificado ou que pode impedir o comportamento desejado de ser executado ou realizado com sucesso
- Deve ser algo que, se esclarecido, torna o comportamento desejado possível de ser executado/realizado com sucesso ou que reduza significativamente o risco de não executar/realizar o comportamento desejado com sucesso

## Pense e raciocíne nesta ordem:
- Foque nas perguntas que revelam lacunas de conhecimento não esclarecidos pelas respostas e extraia incertezas a partir delas
- Foque nas perguntas com respostas que indiquem falta de informação e/ou respostas vagas e extraia incertezas a partir delas
- Foque nas perguntas que indicam suposições que não foram validadas e extraia incertezas a partir delas
- Foque nas perguntas e respostas que indicam conflitos entre cenários de exceção e o fluxo normal e extraia incertezas a partir delas
- Das incertezas identificadas, identifique apenas UMA incerteza, a de aspecto mais crítico ou relevante, que se esclarecida, torna o comportamento desejado possível de ser executado/realizado com sucesso ou que reduza significativamente o risco de não executar/realizar o comportamento desejado com sucesso

## Restrições textuais e formato da resposta
- Deve retornar APENAS uma string com a descrição concisa da incerteza identificada
- Deve ter no máximo até 200 caracteres
- Não use markdown. Não dê explicações adicionais além da declaração
- Sem aspas ao longo do texto da resposta
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
