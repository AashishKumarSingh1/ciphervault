from pydantic import BaseModel
from typing import List, Optional

class SecurityTestCaseResult(BaseModel):
    id: str
    name: str
    description: str
    status: str # "PASSED", "FAILED"
    expected_result: str
    actual_result: str
    mitigation_mechanism: str
    execution_time_ms: float
    timestamp: str

class SecuritySuiteResponse(BaseModel):
    suite_name: str
    timestamp: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    all_passed: bool
    results: List[SecurityTestCaseResult]
    scope_notice: str
