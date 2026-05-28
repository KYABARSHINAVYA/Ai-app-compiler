def simulate_runtime(config):

    ui_pages = len(config.get("ui_schema", {}).get("pages", []))
    api_routes = len(config.get("api_schema", {}).get("routes", []))
    db_tables = len(config.get("database_schema", {}).get("tables", []))

    return {
        "status": "success",
        "pages": ui_pages,
        "routes": api_routes,
        "tables": db_tables
    }