SPECIFICATION_CONJECTURAL_REFINEMENT_PROMPT = {
    "en": """You are an expert in software requirements specification with uncertainties.
A software requirement with uncertainty is called a conjectural requirement.

# General instruction

Your task is to generate an **improved version** of a conjectural requirement specification, based on the following two sources of information:
1 - A conjectural requirement specification generated in a previous attempt
2 - Quality criteria evaluations related to that attempt, including scores and justifications

Focus especially on criteria that received low scores (1-3), analyzing their respective justifications.

## General Project Information

**Project Summary:**
{project_summary}

**Business Domain:** {domain}

**Primary Stakeholder:** {stakeholder}

**Business Objective:** {business_objective}

## Previous Conjectural Requirement

**FERC (Writing Format for Conjectural Requirements):**
**It is expected that the software system has** {prev_desired_behavior}
**So that** {prev_positive_impact}
**However, we do not know** {prev_uncertainties}

**QESS (Solution Assumption Experimentation Framework):**
**We expect that** {prev_solution_assumption}
**Will result in updating the uncertainties about** {prev_uncertainty_evaluated}
**As a result of** {prev_observation_analysis}

## Evaluations of the Previous Requirement

{evaluation_summary}

## Conjectural Requirement Specification Template

**FERC (Writing Format for Conjectural Requirements):**
**It is expected that the software system has** [desired behavior]
**So that** [positive impact]
**However, we do not know** [uncertainty]

**QESS (Solution Assumption Experimentation Framework):**
**We expect that** [solution assumption]
**Will result in updating the uncertainties about** [uncertainty]
**As a result of** [observation description]

## Specific instructions for each field

[desired behavior] -> Refers to a text describing a desired system behavior to achieve the [positive impact] in the business
[positive impact] -> Refers to a text describing a desired positive impact in the business
[uncertainty] -> Refers to a text describing an uncertainty in achieving the [positive impact] in the business

[solution assumption] -> Refers to a text describing a solution hypothesis based on an experimental process to resolve the [uncertainty]
[uncertainty] -> Same text as the [uncertainty] field in FERC
[observation description] -> Refers to a text describing what will be observed and analyzed in terms of metrics in the experiment proposed in the [solution assumption], which may resolve the doubt about the [uncertainty]

VERY IMPORTANT: The text of each field is the REMAINING complement of an initial sentence, therefore each text must be written so that it agrees grammatically with its respective initial sentence.

## About the response format

You MUST return ONLY a valid JSON object (no markdown, no explanation) with:
- "ferc": an object with:
  - "desired_behavior": [desired behavior] (string)
  - "positive_impact": [positive impact] (string)
  - "uncertainties": only one [uncertainty] (array of strings)
- "qess": an object with:
  - "solution_assumption": [description of the solution assumption] (string)
  - "uncertainty_evaluated": [uncertainty] (string)
  - "observation_analysis": [observation description] (string)
""",
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
**De modo que** {prev_positive_impact}
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
**De modo que** [impacto positivo]
**Porém, não sabemos** [incerteza]

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** [suposição de solução]
**Resulte na atualização da incerteza sobre** [incerteza]
**Como resultado de** [descrição da observação] 

## Instruções específicas sobre cada campo

[comportamento desejado] -> Se refere a um texto que descreve um comportamento desejado no sistema para alcançar o [impacto positivo] no negócio
[impacto positivo] -> Se refere a um texto que descreve um impacto positivo desejado no negócio
[incerteza] -> Se refere a um texto que descreve uma incerteza para alcançar o [impacto positivo] no negócio

[suposição de solução] -> Se refere a um texto que descreve uma hipótese de solução baseada em processo experimental para resolver a [incerteza]
[incerteza] -> Mesmo texto elaborado para o campo [incerteza] do FERC
[descrição da observação] -> Se refere a um texto que descreve o que será observado e analisado em termos de métricas no experimento proposto na [suposição de solução], que poderá resolver a dúvida sobre a [incerteza]

MUITO IMPORTANTE: O texto de cada campo é um complemento RESTANTE de uma frase inicial, portanto cada texto deve ser elaborado para que tenha concordancia com sua respectiva frase inicial.

## Sobre o formato de resposta

Você DEVE retornar APENAS um objeto JSON válido (sem markdown, sem explicação) com:
- "ferc": um objeto com:
  - "desired_behavior": [comportamento desejado] (string)
  - "positive_impact": [impacto positivo] (string)
  - "uncertainties": apenas uma [incerteza] (array de strings)
- "qess": um objeto com:
  - "solution_assumption": [descrição da suposição de solução] (string)
  - "uncertainty_evaluated": [incerteza] (string)
  - "observation_analysis": [descrição da observação] (string)
""",
}
