from jsonschema import validate, ValidationError

SCHEMA = {
    "type": "object",
    "required": [
        "ui_schema",
        "api_schema",
        "database_schema",
        "auth_rules"
    ]
}

def validate_output(output):

    try:
        validate(instance=output, schema=SCHEMA)

        return {
            "valid": True,
            "errors": []
        }

    except ValidationError as e:

        return {
            "valid": False,
            "errors": [str(e)]
        }