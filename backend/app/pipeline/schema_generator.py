from app.llm.gemini_client import ask_gemini
from app.utils.json_utils import extract_json

def generate_schema(architecture):

    prompt = f'''
Generate COMPLETE app schema.

Include:
- ui_schema
- api_schema
- database_schema
- auth_rules

STRICT JSON ONLY.

{architecture}
'''

    response = ask_gemini(prompt)

    return extract_json(response)