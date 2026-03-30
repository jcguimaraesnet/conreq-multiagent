SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT = {
    "pt-br": """Você é um especialista em especificação de requisitos de software com incertezas.
Um requisito de software com incerteza é chamado de requisito conjectural.

# Instrução geral

Sua tarefa é gerar uma **versão melhorada** de uma especificação de requisito conjectural, com base nas duas fontes de informação a seguir:
1 - Uma especificação de requisito conjectural gerada em uma tentativa anterior
2 - Avaliações de com base em critérios de qualidade relacionadas a essa tentativa, incluindo pontuações e justificativas

Foque especialmente nos critérios que receberam pontuações baixas (1-3), analisando suas respectivas justificativas.

## Informações Gerais do Projeto

**Resumo do Projeto:**
{project_summary}

**Domínio de Negócio:** {domain}

**Stakeholder Principal:** {stakeholder}

**Objetivo de Negócio:** {business_objective}

## Requisito Conjectural Anterior

**FERC (Formato de Escrita para Requisitos Conjecturais):**
**É esperado que o sistema de software possua** {prev_desired_behavior}
**De modo que** {prev_business_need}
**Porém, não sabemos** {prev_uncertainties}

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** {prev_solution_assumption}
**Resulte na atualização da incerteza sobre** {prev_uncertainty_evaluated}
**Como resultado de** {prev_observation_analysis}

## Avaliações do Requisito Anterior

{evaluation_summary}

## Modelo de Especificação de Requisito Conjectural

**FERC (Formato de Escrita para Requisitos Conjecturais):**
**É esperado que o sistema de software possua** [comportamento desejado]
**De modo que** [necessidade de negócio]
**Porém, não sabemos** [incerteza]

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** [suposição de solução]
**Resulte na atualização da incerteza sobre** [incerteza]
**Como resultado de** [descrição da observação]

## Instruções específicas sobre cada campo

[comportamento desejado] -> Se refere a um texto que descreve um comportamento desejado no sistema para alcançar o [necessidade de negócio] no negócio
[necessidade de negócio] -> Se refere a um texto que descreve um impacto positivo desejado no negócio
[incerteza] -> Se refere a um texto que descreve uma incerteza para alcançar o [necessidade de negócio] no negócio

[suposição de solução] -> Se refere a um texto que descreve uma hipótese de solução baseada em processo experimental para resolver a [incerteza]
[incerteza] -> Mesmo texto elaborado para o campo [incerteza] do FERC
[descrição da observação] -> Se refere a um texto que descreve o que será observado e analisado em termos de métricas no experimento proposto na [suposição de solução], que poderá resolver a dúvida sobre a [incerteza]

MUITO IMPORTANTE: O texto de cada campo é um complemento RESTANTE de uma frase inicial, portanto cada texto deve ser elaborado para que tenha concordancia com sua respectiva frase inicial.

## Sobre o formato de resposta

Você DEVE retornar APENAS um objeto JSON válido (sem markdown, sem explicação) com:
- "ferc": um objeto com:
  - "desired_behavior": [comportamento desejado] (string)
  - "business_need": [necessidade de negócio] (string)
  - "uncertainty": [incerteza] (string)
- "qess": um objeto com:
  - "solution_assumption": [descrição da suposição de solução] (string)
  - "uncertainty_evaluated": [incerteza] (string)
  - "observation_analysis": [descrição da observação] (string)

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
