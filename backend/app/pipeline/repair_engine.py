def repair_output(output, errors):

    if "auth_rules" not in output:
        output["auth_rules"] = {
            "default": "user"
        }

    return output