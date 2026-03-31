ELICITATION_ANSWER_WHATIF_QUESTIONS_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software.

# Instrução
Com base nas informações de contexto abaixo, responda cada uma das perguntas do tipo What-If (sobre cenários de exceção).

# Contexto

## Visão do projeto
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

## Principal Stakeholder
{stakeholder}

## Comportamento desejado:
{desired_behavior}

# Perguntas What-If:
{questions}

## Diretrizes para elaborar as respostas
- As respostas devem ser claras, objetivas e específicas dentro do contexto de cada pergunta.
- As respostas devem estar alinhadas com o objetivo de negócio e o comportamento desejado.
- As respostas devem descrever como o sistema deveria se comportar no cenário de exceção indicado na pergunta, mesmo que esse cenário seja improvável ou indesejado.
- As respostas devem indicar explicitamente quando não há informação suficiente para responder, colocando na resposta algo como "desconhecido", "não especificado", "não definido" ou termos similares, para indicar a falta de informação ou definição sobre o comportamento do sistema nesse cenário de exceção.
- As respostas DEVEM se fundamentar nas informações contidas na visão do projeto.

## Restrições textuais e formato da resposta
- Deve retornar APENAS um array JSON válido de strings, onde cada string é a resposta correspondente à pergunta na mesma ordem
- Cada resposta deve ter até 300 caracteres
- Não use markdown. Não dê explicações adicionais além do JSON
- Sem aspas ao longo do texto da resposta. Se precisar citar algo, use aspas simples
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}
""",
}
