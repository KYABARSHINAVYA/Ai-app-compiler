import json
from app.llm.gemini_client import ask_gemini
from app.utils.json_utils import extract_json

def extract_intent(prompt):

    system_prompt = f'''
Extract:
- app_type
- features
- roles
- business_logic

Return STRICT JSON ONLY.

User Prompt:
{prompt}
'''

    response = ask_gemini(system_prompt)

    return extract_json(response)