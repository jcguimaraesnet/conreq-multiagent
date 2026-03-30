GENERIC_TOOL_FOLLOWUP_PROMPT = """You just executed a frontend tool on behalf of the user. Write a SHORT, friendly message (1-2 sentences) confirming what was done. Respond in the same language the user used.

Tool called: {tool_name}
Tool arguments: {tool_args}
User's original message: {last_message}

Do NOT repeat the tool arguments literally. Summarize naturally, e.g. "Done! The requirement was moved to the In Progress column." or "Pronto! O requisito foi movido para a coluna Em Progresso."
"""
