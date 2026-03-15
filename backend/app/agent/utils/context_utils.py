import json
from app.agent.state import WorkflowState

def extract_copilotkit_context(state: WorkflowState) -> dict:
    """Extract user, project and settings data from copilotkit context."""
    context = state.get("copilotkit", {}).get("context", [])

    current_user_item = next(
        (item for item in context if item.get("description") == "CurrentUser"),
        None
    )
    current_user = json.loads(current_user_item.get("value")) if current_user_item else None

    current_project_id_item = next(
        (item for item in context if item.get("description") == "CurrentProjectId"),
        None
    )
    current_project_id = current_project_id_item.get("value") if current_project_id_item else None

    current_user_settings_item = next(
        (item for item in context if item.get("description") == "CurrentUserSettings"),
        None
    )
    current_user_settings = json.loads(current_user_settings_item.get("value")) if current_user_settings_item else {}

    batch_mode = current_user_settings.get("batch_mode")
    quantity_req_batch = 1 if batch_mode == False else current_user_settings.get("quantity_req_batch")

    return {
        "current_user_id": current_user.get("id") if current_user else None,
        "current_user_first_name": current_user.get("user_metadata", {}).get("first_name") if current_user else None,
        "current_project_id": current_project_id,
        "require_brief_description": current_user_settings.get("require_brief_description"),
        "require_evaluation": current_user_settings.get("require_evaluation"),
        "batch_mode": batch_mode,
        "quantity_req_batch": quantity_req_batch,
        "spec_attempts": current_user_settings.get("spec_attempts", 3),
        "model": current_user_settings.get("model"),
        "model_judge": current_user_settings.get("model_judge", "gemini"),
    }
