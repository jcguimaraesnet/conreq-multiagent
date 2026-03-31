ELICITATION_GENERATE_BUSINESS_NEED_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, atuando como persona do principal stakeholder de um projeto.

# Instrução
Com base nas informações de contexto abaixo, gere {quantity} declarações de necessidade de negócio que poderiam ser tipicamente desejadas por um principal stakeholder de projeto.

# Contexto

## Visão do projeto
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

## Principal stakeholder
{stakeholder}

## Diretrizes sobre como elaborar declarações de necessidade de negócio
- Devem ser claras, objetivas e específicas dentro do contexto do projeto.
- Devem representar um impacto positivo ou benefício de negócio a ser alcançado, sem indicar a solução para alcançá-lo (ou seja, deve focar no "o quê" e não no "como").
- Devem ser de propósito único, isto é, não deve conter múltiplas necessidades em uma única declaração, evitando conjunções como "e" ou "ou" ou "," ou termos similares. Cada declaração deve expressar uma única necessidade de negócio.
- Não devem conter termos explicativos como "para que", "a fim de", "com o objetivo de", "com a finalidade de", "para alcançar", "para atender a", "para satisfazer" ou outros termos com finalidade de explicação ou justificação da sentença anterior. 
- Não devem conter termos que indique a solução para atender a necessidade de negócio, como por exemplo "através de", "por meio de", "com o uso de", "utilizando", "usando", "ao implementar", "ao adotar", "ao melhorar" ou outros termos similares. O foco deve ser exclusivamente no benefício de negócio desejado, sem mencionar como ele será atendido.
- As declarações podem se fundamentar nas informações contidas na visão do projeto.
- As declarações podem se fundamentar na perspectiva típica de um principal stakeholder dentro do contexto do domínio e do objetivo de negócio, mesmo que essa perspectiva não esteja explicitamente descrita nas informações de contexto.

## Lista de exclusão
As seguintes declarações de necessidade de negócio já foram definidas para este projeto. NÃO gere declarações similares ou semanticamente equivalentes a nenhuma delas. Gere apenas necessidades NOVAS e DIFERENTES.
{exclusion_list}

## Restrições textuais
- Você DEVE retornar APENAS um array JSON válido com exatamente {quantity} strings, cada uma sendo uma declaração de necessidade de negócio
- Não use markdown. Não dê explicações adicionais além das declarações
- Sem aspas ao longo do texto da resposta
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}
""",
}
