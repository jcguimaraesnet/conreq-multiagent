SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT = {
    "en": """You are an expert in software requirements specification with uncertainties.
A software requirement with uncertainty is called a conjectural requirement.

# General instruction

Your task is to generate a conjectural requirement specification, according to the instructions below.
Generate exactly ONE conjectural requirement by filling in the bracketed fields contained in the Conjectural Requirement Specification Template,
based on the information below.

## General Project Information

**Project Summary:**
{project_summary}

**Business Domain:** {domain}

**Primary Stakeholder:** {stakeholder}

**Business Objective:** {business_objective}

## Specific information to guide the generation of the conjectural requirement specification

- **Initial idea of positive impact:** {positive_impact}
- **Initial idea of uncertainty:** {uncertainty}
- **Initial idea of solution hypothesis:** {supposition_solution}

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

[desired behavior] -> Refers to a text describing a desired system behavior to achieve the [positive impact]
[positive impact] -> Refers to a refined text based on the **initial idea of positive impact** desired in the business
[uncertainty] -> Refers to a refined text based on the **initial idea of uncertainty** to achieve the [positive impact] in the business

[solution assumption] -> Refers to a refined text based on the **initial idea of solution hypothesis** to resolve the [uncertainty]
[uncertainty] -> Same text as the [uncertainty] field in FERC
[observation description] -> Write a text describing what will be observed and analyzed in terms of metrics in the experiment proposed in the [solution assumption], which may resolve the doubt about the uncertainty

VERY IMPORTANT: The text of each field is the REMAINING complement of an initial sentence, therefore each text must be written so that it agrees grammatically with its respective initial sentence.


## Examples

**Example 1:**
FERC:
**It is expected that the software system has** low-cost equipment
**So that** the product can be sold at a lower price than other products currently on the market with similar functions.
**However, we do not know:**
- **Uncertainty:** which equipment (sensors, wearables, cables, connectors, and display) are functional and have the lowest cost.
QESS:
**We expect that** using a finger clip to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor
**Will result in updating the uncertainties about** the low-cost device configuration that will be used for building the software system
**As a result of** observation of the operation of the finger clip oximeter and the data generated.

**Example 2:**
FERC:
**It is expected that the software system has** easy-to-assemble equipment
**So that** the equipment can be assembled quickly by people without electronics knowledge.
**However, we do not know:**
- **Uncertainty:** which cable and connector models facilitate assembly.
- **Uncertainty:** the acceptable assembly time.
QESS:
**We expect that** using a finger clip to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor through a single data cable
**Will result in updating the uncertainties about** the ease of assembly of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the finger clip oximeter with a single data cable and the data generated.

**Example 3:**
FERC:
**It is expected that the software system has** reliability
**So that** signal measurement is performed without interference from external lighting.
**However, we do not know:**
- **Uncertainty:** which type of device allows measurement without harmful interference.
QESS:
**We expect that** using an elastic wristband with two sensor compartments to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor
**Will result in updating the uncertainties about** the reliability of vital signs measurement (measurement without external interference) of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the oximeter with the elastic wristband and the data generated.

**Example 4:**
FERC:
**It is expected that the software system has** stability
**So that** signal measurement remains consistent in the same patient over a long period, considering body movements.
**However, we do not know:**
- **Uncertainty:** which sensor models guarantee measurement stability over long periods, considering body movements.
QESS:
**We expect that** using a rigid half-moon shaped wristband with two sensor compartments to obtain data on oxygenation, temperature, and heart rate of a patient for display on a screen controlled by a low-cost NodeMCU processor through a single digital data cable with RJ11 connector
**Will result in updating the uncertainties about** the stability of the sensors on the patient's arm of the low-cost device that will be used for building the software system
**As a result of** observation of the operation of the oximeter with the rigid wristband and the data generated.

## About the response format

You MUST return ONLY a valid JSON object (no markdown, no explanation) with:
- "ferc": an object with:
  - "desired_behavior": [desired behavior] (string)
  - "positive_impact": [positive impact] (string)
  - "uncertainties": only one [uncertainty] (array of strings)
- "qess": an object with:
  - "solution_assumption": [solution assumption] (string)
  - "uncertainty_evaluated": [uncertainty] (string)
  - "observation_analysis": [observation description] (string)
""",
    "pt-br": """Você é um especialista em especificação de requisitos de software com incertezas.
Um requisito de software com incerteza é chamado de requisito conjectural.

# Instrução geral

Sua tarefa é gerar uma especificação de requisito conjectural, de acordo com as instruções abaixo.
Gere exatamente UM requisito conjectural preenchendo os campos entre colchetes contidos no Modelo de Especificação de Requisito Conjectural, 
tomando como base as informações abaixo.

## Informações Gerais do Projeto

**Resumo do Projeto:**
{project_summary}

**Domínio de Negócio:** {domain}

**Stakeholder Principal:** {stakeholder}

**Objetivo de Negócio:** {business_objective}

## Informações específicas para guiar a geração da especificação do requisito conjectural

- **Ideia inicial de impacto positivo:** {positive_impact}
- **Ideia inicial de incerteza:** {uncertainty}
- **Ideia inicial de hipótese de solução:** {supposition_solution}

## Modelo de Especificação de Requisito Conjectural

**FERC (Formato de Escrita para Requisitos Conjecturais):**
**É esperado que o sistema de software possua** [comportamento desejado]
**De modo que** [impacto positivo]
**Porém, não sabemos** [incerteza]

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** [suposição de solução]
**Resulte na atualização das incertezas sobre** [incerteza]
**Como resultado de** [descrição da observação] 

## Instruções específicas sobre cada campo

[comportamento desejado] -> Se refere a um texto que descreve um comportamento desejado no sistema para alcançar o [impacto positivo]
[impacto positivo] -> Se refere a um texto refinado da **ideia inicial de impacto positivo** desejado no negócio
[incerteza] -> Se refere a um texto refinado da **ideia inicial de incerteza** para alcançar o [impacto positivo] no negócio

[suposição de solução] -> Se refere a um texto refinado da **ideia inicial de hipótese de solução** para resolver a [incerteza]
[incerteza] -> Mesmo texto elaborado para o campo [incerteza] do FERC
[descrição da observação] -> Elabore um texto que descreva o que será observado e analisado em termos de métricas do experimento proposto na [suposição de solução], que poderá resolver a dúvida sobre a incerteza

MUITO IMPORTANTE: O texto de cada campo é um complemento RESTANTE de uma frase inicial, portanto cada texto deve ser elaborado para que tenha concordancia com sua respectiva frase inicial.


## Exemplos

**Exemplo 1:**
FERC:
**É esperado que o sistema de software possua** equipamento de baixo custo
**De modo que** o produto possa ser vendido a um preço menor do que outros produtos atualmente no mercado com funções similares.
**Porém, não sabemos:**
- **Incerteza:** quais equipamentos (sensores, wearables, cabos, conectores e display) são funcionais e possuem o menor custo.
QESS:
**Esperamos que** o uso de um clipe de dedo para obter dados de oxigenação, temperatura e frequência cardíaca de um paciente para exibição em uma tela controlada por um processador NodeMCU de baixo custo
**Resulte na atualização das incertezas sobre** a configuração de dispositivo de baixo custo que será usada para construção do sistema de software
**Como resultado de** observação do funcionamento do oxímetro de clipe de dedo e dos dados gerados.

**Exemplo 2:**
FERC:
**É esperado que o sistema de software possua** equipamento de fácil montagem
**De modo que** o equipamento possa ser montado rapidamente por pessoas sem conhecimento em eletrônica.
**Porém, não sabemos:**
- **Incerteza:** quais modelos de cabo e conector facilitam a montagem.
- **Incerteza:** o tempo aceitável de montagem.
QESS:
**Esperamos que** o uso de um clipe de dedo para obter dados de oxigenação, temperatura e frequência cardíaca de um paciente para exibição em uma tela controlada por um processador NodeMCU de baixo custo através de um único cabo de dados
**Resulte na atualização das incertezas sobre** a facilidade de montagem do dispositivo de baixo custo que será usado para construção do sistema de software
**Como resultado de** observação do funcionamento do oxímetro de clipe de dedo com um único cabo de dados e dos dados gerados.

**Exemplo 3:**
FERC:
**É esperado que o sistema de software possua** confiabilidade
**De modo que** a medição de sinais seja realizada sem interferência da iluminação externa.
**Porém, não sabemos:**
- **Incerteza:** qual tipo de dispositivo permite medição sem interferência prejudicial.
QESS:
**Esperamos que** o uso de uma pulseira elástica com dois compartimentos de sensores para obter dados de oxigenação, temperatura e frequência cardíaca de um paciente para exibição em uma tela controlada por um processador NodeMCU de baixo custo
**Resulte na atualização das incertezas sobre** a confiabilidade da medição de sinais vitais (medição sem interferência externa) do dispositivo de baixo custo que será usado para construção do sistema de software
**Como resultado de** observação do funcionamento do oxímetro com a pulseira elástica e dos dados gerados.

**Exemplo 4:**
FERC:
**É esperado que o sistema de software possua** estabilidade
**De modo que** a medição de sinais permaneça consistente no mesmo paciente por um longo período, considerando movimentos corporais.
**Porém, não sabemos:**
- **Incerteza:** quais modelos de sensores garantem estabilidade de medição por longos períodos, considerando movimentos corporais.
QESS:
**Esperamos que** o uso de uma pulseira rígida em formato de meia-lua com dois compartimentos de sensores para obter dados de oxigenação, temperatura e frequência cardíaca de um paciente para exibição em uma tela controlada por um processador NodeMCU de baixo custo através de um único cabo de dados digital com conector RJ11
**Resulte na atualização das incertezas sobre** a estabilidade dos sensores no braço do paciente do dispositivo de baixo custo que será usado para construção do sistema de software
**Como resultado de** observação do funcionamento do oxímetro com a pulseira rígida e dos dados gerados.

## Sobre o formato de resposta

Você DEVE retornar APENAS um objeto JSON válido (sem markdown, sem explicação) com:
- "ferc": um objeto com:
  - "desired_behavior": [comportamento desejado] (string)
  - "positive_impact": [impacto positivo] (string)
  - "uncertainties": apenas uma [incerteza] (array de strings)
- "qess": um objeto com:
  - "solution_assumption": [suposição de solução] (string)
  - "uncertainty_evaluated": [incerteza] (string)
  - "observation_analysis": [descrição da observação] (string)
""",
}
