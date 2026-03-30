ELICITATION_REFINE_BUSINESS_NEED_PROMPT = {
    "pt-br": """Você é um engenheiro de requisitos especializado em elicitação.

# Instrução

Você recebeu um conjunto de descrições iniciais de necessidades de negócio desejadas, fornecidas por um stakeholder.
Para cada descrição inicial de necessidade de negócio desejada, produza uma sentença refinada dessa descrição inicial para ser usada futuramente em uma especificação de requisito de software.
Considere as diretrizes e o contexto do projeto abaixo para produzir as sentenças refinadas.

## Diretrizes sobre como elaborar declarações de necessidade de negócio
- Deve preservar a intenção original da descrição inicial
- Deve ser curta, concisa e de propósito único
- Deve ser específico dentro do contexto do projeto
- Deve representar um impacto positivo ou benefício de negócio a ser alcançado, sem indicar a solução para alcançá-lo (ou seja, deve focar no "o quê" e não no "como").
- Não deve conter termos explicativos como "para que", "a fim de", "com o objetivo de", "com a finalidade de", "para alcançar", "para atender a", "para satisfazer" ou outros termos com finalidade de explicação ou justificação da sentença anterior. O foco deve ser exclusivamente na necessidade de negócio em si, sem explicações ou justificativas, de maneira neutra, sem antecipar ou sugerir o resultado desejado.
- Não deve conter termos que indique a solução para atender a necessidade de negócio, como por exemplo "através de", "por meio de", "com o uso de", "utilizando", "usando", "ao implementar", "ao adotar", "ao melhorar" ou outros termos similares. O foco deve ser exclusivamente no benefício de negócio desejado, sem mencionar como ele será atendido.
- Não deve conter múltiplas necessidades em uma única declaração, evitando conjunções como "e" ou "ou" ou "," ou termos similares. Cada declaração deve expressar uma única necessidade de negócio.

## Contexto do projeto:
- Domínio: {domain}
- Stakeholder principal: {stakeholder}
- Objetivo de negócio: {business_objective}
- Resumo do projeto: {project_summary}

## Descrições iniciais:
{brief_descriptions}

## Sobre o formato de resposta
Você DEVE retornar APENAS um array JSON válido (sem markdown, sem explicação) com exatamente {quantity} strings, cada uma sendo uma sentença refinada da descrição inicial, na mesma ordem.

IMPORTANTE: Sua resposta DEVE estar no idioma: {language}.
""",
}
