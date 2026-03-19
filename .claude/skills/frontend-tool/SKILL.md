---
name: frontend-tool
description: Use this skill when creating a new frontend tool (useFrontendTool) that can be invoked by a LangGraph agent via CopilotKit. Covers frontend registration, backend binding, declaration order, message ordering, and friendly follow-up patterns.
---

# Frontend Tool — Project Standard

This skill defines the full pattern for creating a **frontend tool** that a LangGraph backend agent can invoke through CopilotKit. Use this as a checklist when creating new tools.

## Architecture Overview

```
User message -> LangGraph node (backend) -> LLM calls tool -> CopilotKit executes handler (frontend)
```

The tool is **registered on the frontend** via `useFrontendTool` and becomes available to backend nodes through `state.get("tools", [])`.

## 1. Frontend — Tool Registration

File: `src/app/conjectural-requirements/page.tsx`

```tsx
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { z } from "zod";

useFrontendTool({
  name: "toolName",
  description: "Clear description of what the tool does. Include valid parameter values in the description.",
  parameters: z.object({
    param1: z.string().describe("Description of param1 (e.g., REQ-C001)"),
    param2: z.enum(["val1", "val2", "val3"]).describe("Description with valid values"),
  }),
  followUp: false,
  handler: async ({ param1, param2 }: { param1: string; param2: SomeType }) => {
    // Validate input against current state
    const item = someState.find((r) => r.field === param1);
    if (!item) {
      return { success: false, error: `Item ${param1} not found` };
    }

    // Perform the action
    await someHandler(item.id, param2);

    // Return result
    return { success: true, message: `Action completed for ${param1}` };
  },
}, [someState, someHandler]); // dependency array — list all state/handlers used
```

### Rules

- **`followUp: false`** — always set to `false` unless the tool needs to continue the conversation after execution.
- **Return `{ success: boolean }`** — always return a result object so the LLM knows if the action succeeded or failed.
- **Validate before acting** — check that the referenced entity exists and that the action makes sense (e.g., not moving to the same status).
- **Dependency array** — list ALL state variables and callbacks used inside the handler. This is the second argument to `useFrontendTool`.

## 2. Frontend — Declaration Order (CRITICAL)

The `useFrontendTool` call MUST appear **AFTER** all state variables and hooks it references. Otherwise TypeScript raises:

> Block-scoped variable 'X' used before its declaration.

```tsx
// WRONG — tool declared before state
useFrontendTool({ handler: async () => { someState... } }, [someState]);
const [someState, setSomeState] = useState([]);  // <-- declared AFTER use

// CORRECT — state declared first, tool after
const [someState, setSomeState] = useState([]);
const someHandler = useCallback(...);
useFrontendTool({ handler: async () => { someState... } }, [someState, someHandler]);
```

## 3. Frontend — Optional Render Function

If the tool should display a visual result in the chat sidebar:

```tsx
import { ToolCallStatus } from "@copilotkit/react-core/v2";

useFrontendTool({
  name: "toolName",
  // ... parameters, handler ...
  render: ({ status, result }) => {
    if (status !== ToolCallStatus.Complete || !result) return null;
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    if (!parsed?.success) return null;

    return (
      <div className="...">
        {/* render result visually */}
      </div>
    );
  },
}, [dependencies]);
```

## 4. Backend — Binding Tools in a LangGraph Node

Any node that should be able to invoke frontend tools MUST bind them from state:

```python
from app.agent.llm_config import get_model

model = get_model(provider=model_provider, temperature=1.0)
frontend_tools = state.get("tools", [])
if frontend_tools:
    model = model.bind_tools(frontend_tools)
```

The tools from `state.get("tools", [])` are automatically populated by CopilotKit with all tools registered via `useFrontendTool` on the frontend.

## 5. Backend — Friendly Follow-up Message (CRITICAL)

When the LLM decides to call a tool, it often returns **only** the `tool_call` with no text content. The user sees nothing in the chat. To fix this, generate a follow-up message:

```python
from langchain_core.messages import SystemMessage

response = await model.ainvoke(conversation, config_internal)

if hasattr(response, 'tool_calls') and response.tool_calls and not extract_text(response.content).strip():
    tool_call = response.tool_calls[0]
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})

    followup_model = get_model(provider=model_provider, temperature=1.0)
    followup_prompt = TOOL_FOLLOWUP_PROMPT.format(
        tool_name=tool_name,
        tool_args=tool_args,
        last_message=last_message,
    )
    followup_response = await followup_model.ainvoke(
        [SystemMessage(content=followup_prompt)],
        config_internal,
    )
    followup_response.content = extract_text(followup_response.content)
```

## 6. Backend — Message Ordering in Command (CRITICAL)

The message containing the `tool_calls` MUST be the **last item** in the messages list. CopilotKit only executes the tool from the last message. The friendly follow-up comes **before** the tool call:

```python
# WRONG — tool call is NOT last, CopilotKit won't execute it
return Command(update={
    "messages": messages + [response, followup_response]
})

# CORRECT — friendly message first, tool call last
return Command(update={
    "messages": messages + [followup_response, response]
})
```

## 7. Follow-up Prompt Template

```python
TOOL_FOLLOWUP_PROMPT = """You just executed a frontend tool on behalf of the user. Write a SHORT, friendly message (1-2 sentences) confirming what was done. Respond in the same language the user used.

Tool called: {tool_name}
Tool arguments: {tool_args}
User's original message: {last_message}

Do NOT repeat the tool arguments literally. Summarize naturally, e.g. "Done! The requirement was moved to the In Progress column." or "Pronto! O requisito foi movido para a coluna Em Progresso."
"""
```

## Reference Implementation

- **Frontend tool:** `src/app/conjectural-requirements/page.tsx` — `moveRequirement` tool
- **Backend node with tool binding + follow-up:** `backend/app/agent/nodes/generic.py`

## Checklist for New Tools

1. Define `useFrontendTool` in the frontend page component
2. Place the call AFTER all state/hooks it depends on
3. Set `followUp: false` and return `{ success: boolean }`
4. Include all dependencies in the second argument array
5. In the backend node, bind `state.get("tools", [])` to the model
6. Handle empty-content tool call responses with a friendly follow-up
7. Ensure message ordering: `[followup_response, response]` — tool call LAST
