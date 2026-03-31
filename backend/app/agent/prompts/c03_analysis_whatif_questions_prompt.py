ANALYSIS_WHATIF_QUESTIONS_PROMPT = {
    "pt-br": """Você é um engenheiro de requisitos de software, especialista em ideação de cenários.

# Instrução
Com base nas informações de contexto abaixo e no comportamento desejado, realize um processo de ideação de cenários elaborando 3 perguntas do tipo What-If (E se).

# Contexto:

## Visão do projeto: 
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

# Comportamento desejado:
{desired_behavior}

## Diretrizes para elaboração das perguntas do tipo What-If
- As perguntas devem ser claras, objetivas e específicas dentro do contexto do comportamento desejado.
- As perguntas devem estar alinhadas com a visão do projeto, o domínio e o objetivo de negócio.
- As perguntas devem explorar cenários de exceção, edge cases ou situações inesperadas que possam comprometer o comportamento desejado (fluxo normal/happy path).
- As perguntas podem questionar o que acontece quando:
    + Entradas são inválidas, ausentes ou inesperadas
    + Condições de contorno são atingidas
    + Dependências falham ou se comportam de forma inesperada
    + Regras de negócio entram em conflito
    + Volumes ou cargas são atípicos

## Restrições textuais e formato da resposta
- Deve retornar APENAS um array JSON válido de 3 strings, onde cada string é uma pergunta What-If (E se)
- Deve ter no máximo 250 caracteres
- Não use markdown. Não dê explicações adicionais além da declaração
- NÃO use aspas duplas dentro do texto das perguntas. Se precisar citar algo, use aspas simples.
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}
""",
}
