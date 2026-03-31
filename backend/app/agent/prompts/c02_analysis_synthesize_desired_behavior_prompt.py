ANALYSIS_SYNTHESIZE_DESIRED_BEHAVIOR_PROMPT = {
    "pt-br": """Você é um especialista em engenharia de requisitos de software, com foco na formulação de comportamentos funcionais desejados.

# Instrução
Com base nas informações de contexto abaixo e nas perguntas e respostas contextuais, elabore uma declaração de comportamento desejado.

# Contexto:

## Visão do projeto: 
{project_summary}

## Domínio
{domain}

## Objetivo de negócio
{business_objective}

## Necessidade de negócio
{business_need}

# Perguntas e respostas contextuais
{questions_answers}

## Diretrizes para elaboração da declaração de comportamento desejado
- Deve ser clara, objetiva e específica dentro do contexto do projeto
- Deve descrever um comportamento/capacidade funcional no sistema
- Deve ter relação direta com a necessidade de negócio, ou seja, deve ser um comportamento/capacidade que, se implementado, contribui diretamente para atender a necessidade de negócio
- Deve descrever o que o sistema deve fazer, e não como o sistema deve fazer (ou seja, deve focar no "o quê" e não no "como").
- Deve ser de propósito único, ou seja, deve descrever um único comportamento/capacidade desejado, evitando conjunções como "e" ou "ou" ou "," ou termos similares que indiquem múltiplos comportamentos/capacidades desejados.
- Pode se fundamentar nas perguntas e respostas contextuais, especialmente naquelas que ajudam a esclarecer, detalhar e refinar comportamentos e capacidades funcionais desejadas no sistema.

## Restrições textuais e formato da resposta
- Deve ser retornado APENAS uma string com a declaração do comportamento desejado 
- Deve ter no máximo 500 caracteres
- Não use markdown. Não dê explicações adicionais além da declaração
- Sem aspas ao longo do texto da resposta
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}
""",
}
