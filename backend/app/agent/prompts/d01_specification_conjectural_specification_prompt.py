SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT = {
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

- **Ideia inicial de necessidade de negócio:** {business_need}
- **Ideia inicial de incerteza:** {uncertainty}
- **Ideia inicial de hipótese de solução:** {supposition_solution}

## Modelo de Especificação de Requisito Conjectural

**FERC (Formato de Escrita para Requisitos Conjecturais):**
**É esperado que o sistema de software possua** [comportamento desejado]
**De modo que** [necessidade de negócio]
**Porém, não sabemos** [incerteza]

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** [suposição de solução]
**Resulte na atualização das incertezas sobre** [incerteza]
**Como resultado de** [descrição da observação]

## Instruções específicas sobre cada campo

[comportamento desejado] -> Se refere a um texto que descreve um comportamento desejado no sistema para alcançar o [necessidade de negócio]
[necessidade de negócio] -> Se refere a um texto refinado da **ideia inicial de impacto positivo** desejado no negócio (regra importante deste campo: Esse campo deve conter uma ideia única e direta, portanto não use período composto. Não use conectivos como "e", "mas", "porém", "gerúndio" etc. para conectar ou expandir ideias. O texto elaborado deve ter concordância com a frase inicial desse campo "De modo que ")
[incerteza] -> Se refere a um texto refinado da **ideia inicial de incerteza** para alcançar o [necessidade de negócio] no negócio

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
  - "business_need": [necessidade de negócio] (string)
  - "uncertainty": [incerteza] (string)
- "qess": um objeto com:
  - "solution_assumption": [suposição de solução] (string)
  - "uncertainty_evaluated": [incerteza] (string)
  - "observation_analysis": [descrição da observação] (string)

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
