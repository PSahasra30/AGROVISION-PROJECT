from fastapi import APIRouter, Request

from ..schemas import HealthResponse

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    components = dict(request.app.state.components)
    ready = all(value == "ready" for value in components.values())
    return HealthResponse(
        status="ok" if ready else "degraded",
        components=components,
        model_version=request.app.state.settings.model_version,
    )
