const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export interface EncryptedRecord {
  id: string;
  owner_id: string;
  category: string;
  ciphertext_preview: string;
  nonce: string;
  auth_tag: string;
  encryption_version: string;
  created_at: string;
  updated_at: string;
  is_encrypted: boolean;
}

export interface DecryptedRecord {
  id: string;
  owner_id: string;
  category: string;
  full_name: string;
  email: string;
  phone_number: string;
  sensitive_notes: string;
  encryption_version: string;
  nonce: string;
  auth_tag: string;
  created_at: string;
  updated_at: string;
}

export interface EncryptLabResponse {
  success: boolean;
  algorithm: string;
  key_preview: string;
  nonce: string;
  auth_tag: string;
  ciphertext: string;
  ciphertext_length_bytes: number;
  plaintext_length_bytes: number;
  aad_used?: string;
}

export interface DecryptLabResponse {
  success: boolean;
  decrypted_plaintext?: string;
  integrity_verified: boolean;
  error_message?: string;
  verification_details: string;
}

export interface TamperLabResponse {
  tampered_ciphertext: string;
  tampered_nonce: string;
  tampered_auth_tag: string;
  tampered_component: string;
  description: string;
}

export interface BenchmarkResult {
  id: string;
  record_count: number;
  encryption_time_ms: number;
  decryption_time_ms: number;
  avg_encryption_latency_us: number;
  avg_decryption_latency_us: number;
  plaintext_size_bytes: number;
  encrypted_size_bytes: number;
  storage_overhead_pct: number;
  throughput_records_per_sec: number;
  created_at: string;
}

export interface SecurityTestCaseResult {
  id: string;
  name: string;
  description: string;
  status: "PASSED" | "FAILED";
  expected_result: string;
  actual_result: string;
  mitigation_mechanism: string;
  execution_time_ms: number;
  timestamp: string;
}

export interface SecuritySuiteResponse {
  suite_name: string;
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  all_passed: boolean;
  results: SecurityTestCaseResult[];
  scope_notice: string;
}

export interface DashboardStats {
  total_records: number;
  encryption_algorithm: string;
  database_size_bytes: number;
  database_size_formatted: string;
  security_status: string;
  tampering_detected_count: number;
  last_benchmark_latency_us: number;
  categories: { category: string; count: number }[];
  recent_activity: {
    id: string;
    action: string;
    username: string;
    status: string;
    details: string;
    timestamp: string;
  }[];
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ciphervault_token");
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("ciphervault_token", token);
  } else {
    localStorage.removeItem("ciphervault_token");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Sends session cookies
  });

  if (!res.ok) {
    let errorDetail = "Request failed";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // Non-JSON response
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    const data = await request<{
      success: boolean;
      user: User;
      session_token: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setStoredToken(data.session_token);
    return data;
  },

  async logout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<User> {
    return request<User>("/api/auth/me");
  },

  getToken() {
    return getStoredToken();
  },

  // Records
  async listRecords(category?: string, search?: string): Promise<EncryptedRecord[]> {
    const params = new URLSearchParams();
    if (category && category !== "All") params.append("category", category);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<EncryptedRecord[]>(`/api/records${qs}`);
  },

  async getDecryptedRecord(id: string): Promise<DecryptedRecord> {
    return request<DecryptedRecord>(`/api/records/${id}`);
  },

  async createRecord(payload: {
    full_name: string;
    email: string;
    phone_number: string;
    category: string;
    sensitive_notes: string;
  }): Promise<EncryptedRecord> {
    return request<EncryptedRecord>("/api/records", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRecord(
    id: string,
    payload: Partial<{
      full_name: string;
      email: string;
      phone_number: string;
      category: string;
      sensitive_notes: string;
    }>
  ): Promise<EncryptedRecord> {
    return request<EncryptedRecord>(`/api/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteRecord(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/records/${id}`, {
      method: "DELETE",
    });
  },

  // Encryption Lab
  async getLabKey(): Promise<{ lab_key_hex: string; key_length_bits: number }> {
    return request("/api/encryption/lab-key");
  },

  async generateSampleKey(): Promise<{ key_hex: string; key_length_bits: number }> {
    return request("/api/encryption/generate-key");
  },

  async encryptLab(payload: {
    plaintext: string;
    custom_key_hex?: string;
    aad_string?: string;
  }): Promise<EncryptLabResponse> {
    return request<EncryptLabResponse>("/api/encryption/encrypt", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async decryptLab(payload: {
    ciphertext: string;
    nonce: string;
    auth_tag: string;
    custom_key_hex?: string;
    aad_string?: string;
  }): Promise<DecryptLabResponse> {
    return request<DecryptLabResponse>("/api/encryption/decrypt", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async tamperLab(payload: {
    ciphertext: string;
    nonce: string;
    auth_tag: string;
    target: "ciphertext" | "nonce" | "auth_tag";
    byte_index: number;
  }): Promise<TamperLabResponse> {
    return request<TamperLabResponse>("/api/encryption/tamper", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Performance Lab
  async runBenchmark(record_count: number): Promise<BenchmarkResult> {
    return request<BenchmarkResult>("/api/performance/run", {
      method: "POST",
      body: JSON.stringify({ record_count }),
    });
  },

  async getBenchmarkHistory(limit = 15): Promise<{ results: BenchmarkResult[] }> {
    return request<{ results: BenchmarkResult[] }>(`/api/performance/history?limit=${limit}`);
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/api/performance/export`;
  },

  // Security Center
  async runSecurityTests(): Promise<SecuritySuiteResponse> {
    return request<SecuritySuiteResponse>("/api/security/run-tests", {
      method: "POST",
    });
  },

  async getSecurityOverview() {
    return request<Record<string, any>>("/api/security/overview");
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>("/api/dashboard/stats");
  },
};
