import re
import json

def extract_json(text):

    try:

        match = re.search(r'\{.*\}', text, re.DOTALL)

        if match:
            return json.loads(match.group())

        return {
            "ui_schema": {"pages": []},
            "api_schema": {"routes": []},
            "database_schema": {"tables": []},
            "auth_rules": {}
        }

    except Exception as e:

        return {
            "ui_schema": {"pages": []},
            "api_schema": {"routes": []},
            "database_schema": {"tables": []},
            "auth_rules": {},
            "error": str(e)
        }