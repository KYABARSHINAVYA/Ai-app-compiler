from fastapi import APIRouter
from app.pipeline.intent_extractor import extract_intent
from app.pipeline.system_designer import design_system
from app.pipeline.schema_generator import generate_schema
from app.pipeline.refinement_engine import refine_output
from app.pipeline.validation_engine import validate_output
from app.pipeline.repair_engine import repair_output
from app.pipeline.runtime_simulator import simulate_runtime

router = APIRouter()

@router.post("/generate")
async def generate_app(data: dict):

    try:

        prompt = data["prompt"]

        intent = extract_intent(prompt)

        architecture = design_system(intent)

        schema = generate_schema(architecture)

        refined = refine_output(schema)

        validation = validate_output(refined)

        if not validation["valid"]:
            refined = repair_output(
                refined,
                validation["errors"]
            )

        runtime = simulate_runtime(refined)

        return {
            "success": True,
            "intent": intent,
            "architecture": architecture,
            "output": refined,
            "runtime": runtime
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }