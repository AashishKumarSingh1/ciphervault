from pydantic import BaseModel, Field
from typing import List, Optional

class BenchmarkRunRequest(BaseModel):
    record_count: int = Field(100, description="100, 500, 1000, or 5000 records")

class BenchmarkResultResponse(BaseModel):
    id: str
    record_count: int
    encryption_time_ms: float
    decryption_time_ms: float
    avg_encryption_latency_us: float
    avg_decryption_latency_us: float
    plaintext_size_bytes: int
    encrypted_size_bytes: int
    storage_overhead_pct: float
    throughput_records_per_sec: float
    created_at: str

class BenchmarkHistoryResponse(BaseModel):
    results: List[BenchmarkResultResponse]
