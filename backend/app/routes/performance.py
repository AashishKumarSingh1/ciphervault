from fastapi import APIRouter, Response, Depends, Query
from app.schemas.benchmark import BenchmarkRunRequest, BenchmarkResultResponse, BenchmarkHistoryResponse
from app.services.benchmark_service import BenchmarkService
from app.middleware.authentication import get_current_user_optional

router = APIRouter(prefix="/api/performance", tags=["Performance Lab"])

@router.post("/run", response_model=BenchmarkResultResponse)
def run_benchmark(
    req: BenchmarkRunRequest,
    user: dict = Depends(get_current_user_optional)
):
    user_id = user["id"] if user else None
    result = BenchmarkService.run_benchmark(req.record_count, user_id=user_id)
    return BenchmarkResultResponse(**result)

@router.get("/history", response_model=BenchmarkHistoryResponse)
def get_benchmark_history(limit: int = Query(15, ge=1, le=100)):
    history = BenchmarkService.get_history(limit=limit)
    return BenchmarkHistoryResponse(results=[BenchmarkResultResponse(**r) for r in history])

@router.get("/export")
def export_benchmark_csv():
    csv_data = BenchmarkService.export_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ciphervault_benchmark_results.csv"}
    )
