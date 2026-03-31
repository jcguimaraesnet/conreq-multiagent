SPECIFICATION_CONJECTURAL_SPECIFICATION_PROMPT = {
    "pt-br": """Você é um especialista em especificar requisitos de software com incertezas.
Um requisito de software com incerteza é chamado de requisito conjectural.

# Instrução geral

- Sua tarefa é gerar uma especificação de requisito conjectural, de acordo com as informações de contexto abaixo.
- Gere um requisito conjectural preenchendo os campos entre colchetes do "Modelo de Especificação de Requisito Conjectural", tomando como base as "informações brutas" de cada campo.
- Preencha os campos entre colchetes usando a informação bruta de cada campo como base, mantendo a essência do texto da informação bruta.
- MUITO IMPORTANTE: Cada campo é um complemento RESTANTE de uma frase inicial contida no modelo, portanto cada texto deve ser preenchido para que tenha concordancia com sua respectiva frase inicial.

# Contexto

## Informações brutas de cada campo

- Informação bruta de **comportamento desejado:** {desired_behavior}
- Informação bruta de **necessidade de negócio:** {business_need}
- Informação bruta de **incerteza:** {uncertainty}
- Informação bruta de **hipótese de solução:** {supposition_solution}
- informação bruta de **descrição da observação:** {supposition_solution}

## Modelo de Especificação de Requisito Conjectural

**FERC (Formato de Escrita para Requisitos Conjecturais):**
**É esperado que o sistema de software possua** [comportamento desejado]
**De modo que** [necessidade de negócio]
**Porém, não sabemos** [incerteza]

**QESS (Framework de Experimentação de Suposição de Solução):**
**Esperamos que** [suposição de solução]
**Resulte na atualização das incertezas sobre** [incerteza]
**Como resultado de** [descrição da observação]

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

## Formato da resposta
### Deve retornar APENAS um objeto JSON válido no seguinte formato:
- "ferc": um objeto com:
  - "desired_behavior": [comportamento desejado] (string)
  - "business_need": [necessidade de negócio] (string)
  - "uncertainty": [incerteza] (string)
- "qess": um objeto com:
  - "solution_assumption": [suposição de solução] (string)
  - "uncertainty_evaluated": [incerteza] (string)
  - "observation_analysis": [descrição da observação] (string)

## Restrições textuais
- Não use markdown. Não dê explicações adicionais além do JSON especificado no formato da resposta
- Sem aspas ao longo do texto da resposta
- IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
