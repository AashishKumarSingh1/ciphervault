from pydantic import BaseModel
from typing import List, Dict, Any

class ActivityLogItem(BaseModel):
    id: str
    action: str
    username: str
    status: str
    details: str
    timestamp: str

class CategoryStat(BaseModel):
    category: str
    count: int

class DashboardStatsResponse(BaseModel):
    total_records: int
    encryption_algorithm: str = "AES-256-GCM"
    database_size_bytes: int
    database_size_formatted: str
    security_status: str
    tampering_detected_count: int
    last_benchmark_latency_us: float
    categories: List[CategoryStat]
    recent_activity: List[ActivityLogItem]
