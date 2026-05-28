def refine_output(schema):

    db_tables = schema.get("database_schema", {}).get("tables", [])
    api_routes = schema.get("api_schema", {}).get("routes", [])

    for route in api_routes:

        table_exists = any(
            t.get("name") == route.get("entity")
            for t in db_tables
        )

        if not table_exists:
            route["warning"] = "Missing DB table"

    return schema