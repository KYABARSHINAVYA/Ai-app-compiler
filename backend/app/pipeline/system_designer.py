from app.llm.gemini_client import ask_gemini
from app.utils.json_utils import extract_json

def design_system(intent):

    prompt = f'''
Convert this intent into architecture.

Include:
- entities
- pages
- workflows
- auth_roles
- api_modules

JSON ONLY.

{intent}
'''

    response = ask_gemini(prompt)

    return extract_json(response)