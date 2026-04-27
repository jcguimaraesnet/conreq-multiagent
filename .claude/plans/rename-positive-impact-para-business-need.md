# Plano: Renomear "positive impact" → "business need"

## Contexto
O termo "positive impact" está sendo substituído por "business need" em toda a base de código. Isso reflete uma mudança conceitual no domínio: o campo representa a necessidade de negócio por trás de um requisito, não apenas um impacto positivo. A mudança abrange coluna de banco de dados, embeddings, modelos Python, tipos TypeScript, componentes React, prompts de IA e labels de UI.

**Escopo estimado:** 76+ ocorrências em ~22 arquivos

---

## Fase 1: Migração de Banco de Dados (Supabase)

### Criar novo arquivo de migração SQL
**Arquivo novo:** `supabase/rename-positive-impact-to-business-need.sql`

```sql
-- Renomear coluna principal
ALTER TABLE conjectural_requirements
  RENAME COLUMN positive_impact TO business_need;

-- Renomear coluna de embedding
ALTER TABLE conjectural_requirements
  RENAME COLUMN positive_impact_embedding TO business_need_embedding;

-- Renomear função RPC de busca por embeddings
ALTER FUNCTION match_positive_impact_embeddings RENAME TO match_business_need_embeddings;
```

> ⚠️ Executar essa migração no Supabase Dashboard antes de fazer deploy do código.

---

## Fase 2: Backend Python

### 2.1 `backend/app/agent/models/data_context.py`
- `positive_impact: str` → `business_need: str` (classe `FERC`)
- `raw_positive_impact: str` → `raw_business_need: str` (classe `ConjecturalData`)
- `raw_positive_impact_similarity: int` → `raw_business_need_similarity: int`

### 2.2 `backend/app/routers/conjectural_requirements.py`
- `positive_impact: Optional[str] = None` → `business_need: Optional[str] = None`

### 2.3 `backend/app/services/conjectural_persistence.py`
- Todas as chaves `"positive_impact"` → `"business_need"` (linhas 41, 76, 94)
- Referência ao embedding: `positive_impact` → `business_need` (linhas 162-164)

### 2.4 `backend/app/services/embedding_service.py`
- Chamada RPC: `match_positive_impact_embeddings` → `match_business_need_embeddings`

### 2.5 `backend/app/agent/nodes/elicitation.py` (23 ocorrências)
- Imports: atualizar nomes dos módulos de prompt
- Funções: `refine_positive_impacts` → `refine_business_needs`
- Funções: `generate_positive_impacts` → `generate_business_needs`
- Task: `_task_generate_positive_impacts` → `_task_generate_business_needs`
- Todos os acessos `r.get("positive_impact")` → `r.get("business_need")`
- Todos os acessos `cd.raw_positive_impact` → `cd.raw_business_need`

### 2.6 `backend/app/agent/nodes/analysis.py` (9 ocorrências)
- `cd.raw_positive_impact` → `cd.raw_business_need`
- `positive_impacts=impacts_text` → `business_needs=impacts_text` (variável de prompt)

### 2.7 `backend/app/agent/nodes/specification.py` (4 ocorrências)
- `positive_impact=cd.raw_positive_impact` → `business_need=cd.raw_business_need`
- `prev_positive_impact=last_cr.ferc.positive_impact` → `prev_business_need=last_cr.ferc.business_need`

### 2.8 `backend/app/agent/nodes/validation.py` (2 ocorrências)
- `"positive_impact": cr.ferc.positive_impact` → `"business_need": cr.ferc.business_need`
- `positive_impact=cr.ferc.positive_impact` → `business_need=cr.ferc.business_need`

---

## Fase 3: Arquivos de Prompt Python

### 3.1 Renomear arquivos
- `elicitation_generate_positive_impact_prompt.py` → `elicitation_generate_business_need_prompt.py`
- `elicitation_refine_positive_impact_prompt.py` → `elicitation_refine_business_need_prompt.py`
- `analysis_impact_uncertainty_detection_prompt.py` → `analysis_business_need_uncertainty_detection_prompt.py`

### 3.2 Atualizar conteúdo dos prompts (placeholders e texto)
- `{positive_impact}` → `{business_need}` em todos os prompts
- `{positive_impacts}` → `{business_needs}` em prompts de análise
- `{prev_positive_impact}` → `{prev_business_need}` no refinement prompt
- Atualizar texto português nos prompts (ex: "impacto positivo" → "necessidade de negócio")

**Arquivos afetados:**
- `analysis_contextual_questions_prompt.py`
- `analysis_synthesize_desired_behavior_prompt.py`
- `analysis_impact_uncertainty_detection_prompt.py` (renomeado)
- `elicitation_answer_contextual_questions_prompt.py`
- `elicitation_generate_positive_impact_prompt.py` (renomeado)
- `elicitation_refine_positive_impact_prompt.py` (renomeado)
- `specification_conjectural_specification_prompt.py`
- `specification_conjectural_refinement_prompt.py`
- `validation_system_prompt.py`

---

## Fase 4: Frontend TypeScript/React

### 4.1 `src/types/index.ts`
- Interface `ConjecturalRequirement`: `positive_impact: string` → `business_need: string`

### 4.2 Renomear arquivo de componente
- `InterruptFormPositiveImpactDescription.tsx` → `InterruptFormBusinessNeedDescription.tsx`
- Interface: `InterruptFormPositiveImpactDescriptionProps` → `InterruptFormBusinessNeedDescriptionProps`
- Função exportada: `InterruptFormPositiveImpactDescription` → `InterruptFormBusinessNeedDescription`

### 4.3 `src/components/conjectural-requirements/ConjecturalDetailView.tsx`
- Interface local: `positive_impact: string` → `business_need: string`
- State: `positiveImpact` → `businessNeed`, `setPositiveImpact` → `setBusinessNeed`
- Payload HTTP: `positive_impact: positiveImpact` → `business_need: businessNeed`
- Import: atualizar nome do componente renomeado

### 4.4 `src/components/conjectural-requirements/KanbanToolbar.tsx`
- Tipo union: `"positive_impact"` → `"business_need"`
- Label: `positive_impact: "Positive Impact"` → `business_need: "Business Need"`
- Array FIELD_CYCLE: `"positive_impact"` → `"business_need"`

### 4.5 `src/components/conjectural-requirements/InterruptFormEvaluation.tsx`
- `current.positive_impact` → `current.business_need`

### 4.6 `src/app/conjectural-requirements/page.tsx`
- Import: `InterruptFormPositiveImpactDescription` → `InterruptFormBusinessNeedDescription`
- Uso do componente: atualizar nome
- Display: `req.positive_impact` → `req.business_need`
- Filtro de busca: `r.positive_impact` → `r.business_need`

---

## Ordem de Execução Recomendada

1. **Executar migração SQL** no Supabase (necessário antes do deploy)
2. **Backend Python** (models → services → nodes → prompts)
3. **Frontend TypeScript** (types → componentes → páginas)
4. **Renomear arquivos** de componentes e prompts

---

## Verificação

1. Backend: `cd backend && python -m pytest` (se houver testes)
2. Frontend: `pnpm build` para verificar erros de tipo TypeScript
3. Testar fluxo completo: criar um novo requisito conjectural e verificar que o campo "business need" é preenchido e salvo corretamente no banco
4. Verificar que o Kanban exibe "Business Need" como opção de campo
5. Verificar embeddings: o campo de busca semântica funciona com o novo nome da coluna/RPC
