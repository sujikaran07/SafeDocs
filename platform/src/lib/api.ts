export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};

  // First check localStorage (email/password login)
  let token = localStorage.getItem("safedocs_token");

  // If no token, check if user has NextAuth session and get token
  if (!token) {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      if (session?.user) {
        // Google user - get/create backend token
        const tokenRes = await fetch('/api/auth/token');
        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          token = tokenData.access_token;
          // Store it for future requests
          localStorage.setItem("safedocs_token", token);
        }
      }
    } catch (e) {
      console.error('Failed to get auth token:', e);
    }
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface ScanItem {
  scan_id: string;
  report_id?: string;
  filename: string;
  risk_score: number;
  verdict: 'benign' | 'malicious';
  created_at: string;
  download_clean_url?: string;
}

export interface Stats {
  total_scans: number;
  benign: number;
  malicious: number;
  last_activity: string | null;
}

async function handleResponse(res: Response) {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    try { body = await res.text(); } catch { /* noop */ }
  }

  if (!res.ok) {
    const msg = body?.detail || body?.message || (typeof body === 'string' ? body : `${res.status} ${res.statusText}`);
    const err = new Error(msg) as any;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body || {};
}

export const api = {
  API_BASE,
  // Auth
  async signup({ email, password, name }: { email: string; password: string; name?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse(res);
  },

  async login({ email, password }: any): Promise<{ access_token: string; token_type: string }> {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    });
    return handleResponse(res);
  },

  async me(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: { ...(await authHeaders()) },
    });
    return handleResponse(res);
  },

  async changePassword({ old_password, new_password }: any): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ old_password, new_password }),
    });
    return handleResponse(res);
  },

  async deleteAccount(): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/delete`, {
      method: "DELETE",
      headers: { ...(await authHeaders()) },
    });
    return handleResponse(res);
  },

  // Health
  async health(): Promise<any> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Scan
  async scan(file: File): Promise<ScanItem> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/scan`, {
      method: "POST",
      headers: { ...(await authHeaders()) },
      body: form,
    });
    return handleResponse(res);
  },

  // History / Stats
  async getHistory(): Promise<{ items: ScanItem[] }> {
    const res = await fetch(`${API_BASE}/history`, {
      headers: { ...(await authHeaders()) },
    });
    return handleResponse(res);
  },

  async getStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: { ...(await authHeaders()) },
    });
    return handleResponse(res);
  }
};
