// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  portfolio: string;
  message: string;
  status: string;
  adminNotes: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  service?: string;
  budget?: string;
  message: string;
  status: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCourse {
  _id: string;
  slug: string;
  icon: string;
  tag: string;
  title: string;
  dur: string;
  weeks: number;
  classes: number;
  stack: string;
  seats: number;
  price: string;
  priceInr: number;
  desc: string;
  longDesc: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatsData {
  applications: Record<string, number> & { total: number };
  enquiries: Record<string, number> & { total: number };
  users: { total: number };
}

export interface Bill {
  _id: string;
  billType: 'rent' | 'electricity';
  billMonth: string;
  invoiceNumber: string;
  billDate: string;
  dueDate: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid';
  paidDate?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillStats {
  currentMonth: string;
  totalThisMonth: number;
  thisMonthCount: number;
  pendingCount: number;
  paidCount: number;
  pendingAmount: number;
  paidAmount: number;
  upcomingDueCount: number;
  upcomingDue: Array<{
    _id: string;
    billType: string;
    invoiceNumber: string;
    dueDate: string;
    totalAmount: number;
  }>;
}

export interface AuditLog {
  _id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: unknown;
  ip?: string;
  createdAt: string;
}

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function tok(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sts-admin-token') ?? '';
}

function refreshTok(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sts-admin-refresh') ?? '';
}

let _refreshing: Promise<void> | null = null;

async function tryRefresh(): Promise<boolean> {
  const rt = refreshTok();
  if (!rt) return false;
  if (_refreshing) { await _refreshing; return true; }

  _refreshing = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) throw new Error();
      const { token, refreshToken } = await res.json();
      localStorage.setItem('sts-admin-token', token);
      localStorage.setItem('sts-admin-refresh', refreshToken);
    } finally {
      _refreshing = null;
    }
  })();

  try { await _refreshing; return true; } catch { return false; }
}

async function apiFetch<T = unknown>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tok()}`,
      ...(init?.headers ?? {}),
    },
  });

  // Auto-refresh on 401 if we have a refresh token
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, init, false);
  }

  const json = await res.json().catch(() => ({ error: 'Invalid response' }));

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      localStorage.removeItem('sts-admin-token');
      localStorage.removeItem('sts-admin-refresh');
      localStorage.removeItem('sts-admin-user');
      window.location.href = '/admin/login';
    }
    throw new Error(json.error ?? 'Unauthorized');
  }

  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const adminApi = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email: string, password: string, totp?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(totp ? { totp } : {}) }),
    });
    const json = await res.json().catch(() => ({ error: 'Invalid response' }));
    if (!res.ok) throw new Error(json.error ?? 'Login failed');
    return json as { success: boolean; token?: string; refreshToken?: string; user?: AdminUser; requires2FA?: boolean };
  },

  logout: async () => {
    const rt = refreshTok();
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ refreshToken: rt }),
    }).catch(() => {});
    localStorage.removeItem('sts-admin-token');
    localStorage.removeItem('sts-admin-refresh');
    localStorage.removeItem('sts-admin-user');
  },

  forgotPassword: async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({ error: 'Invalid response' }));
    if (!res.ok) throw new Error(json.error ?? 'Request failed');
    return json as { success: boolean; message: string };
  },

  resetPassword: async (token: string, password: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json().catch(() => ({ error: 'Invalid response' }));
    if (!res.ok) throw new Error(json.error ?? 'Request failed');
    return json as { success: boolean; message: string };
  },

  me: () => apiFetch<{ success: boolean; data: AdminUser }>('/api/admin/me'),

  // ── 2FA ───────────────────────────────────────────────────────────────────
  setup2FA: () =>
    apiFetch<{ success: boolean; data: { secret: string; uri: string } }>('/api/admin/2fa/setup'),
  verify2FA: (code: string) =>
    apiFetch<{ success: boolean; backupCodes: string[] }>('/api/admin/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  disable2FA: (password: string, code: string) =>
    apiFetch<{ success: boolean }>('/api/admin/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  stats: (refresh = false) =>
    apiFetch<{ success: boolean; data: StatsData; cached?: boolean }>(
      `/api/admin/stats${refresh ? '?refresh=true' : ''}`
    ),

  revalidate: (path?: string) =>
    apiFetch<{ success: boolean; revalidated: string[] }>('/api/admin/revalidate', {
      method: 'POST',
      body: JSON.stringify(path ? { path } : {}),
    }),

  // ── Applications ──────────────────────────────────────────────────────────
  applications: (params?: Record<string, string>) =>
    apiFetch<ListResponse<Application>>(
      `/api/admin/applications${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  application: (id: string) =>
    apiFetch<{ success: boolean; data: Application }>(`/api/admin/applications/${id}`),
  updateApplication: (id: string, body: { status?: string; adminNotes?: string; restore?: boolean }) =>
    apiFetch<{ success: boolean; data: Application }>(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteApplication: (id: string, permanent = false) =>
    apiFetch<{ success: boolean }>(`/api/admin/applications/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),
  bulkApplications: (ids: string[], action: string, status?: string) =>
    apiFetch<{ success: boolean; modified: number }>('/api/admin/applications/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, action, ...(status ? { status } : {}) }),
    }),
  exportApplications: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    window.location.href = `/api/admin/applications/export${qs}`;
  },

  // ── Enquiries ─────────────────────────────────────────────────────────────
  enquiries: (params?: Record<string, string>) =>
    apiFetch<ListResponse<Enquiry>>(
      `/api/admin/enquiries${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  enquiry: (id: string) =>
    apiFetch<{ success: boolean; data: Enquiry }>(`/api/admin/enquiries/${id}`),
  updateEnquiry: (id: string, body: { status?: string; restore?: boolean }) =>
    apiFetch<{ success: boolean; data: Enquiry }>(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteEnquiry: (id: string, permanent = false) =>
    apiFetch<{ success: boolean }>(`/api/admin/enquiries/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),
  bulkEnquiries: (ids: string[], action: string, status?: string) =>
    apiFetch<{ success: boolean; modified: number }>('/api/admin/enquiries/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, action, ...(status ? { status } : {}) }),
    }),
  exportEnquiries: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    window.location.href = `/api/admin/enquiries/export${qs}`;
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: (params?: Record<string, string>) =>
    apiFetch<ListResponse<AdminUser>>(
      `/api/admin/users${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  createUser: (body: { email: string; password: string; name?: string; phone?: string; role?: string }) =>
    apiFetch<{ success: boolean; data: AdminUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: Partial<AdminUser & { password: string }>) =>
    apiFetch<{ success: boolean; data: AdminUser }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // ── Courses ───────────────────────────────────────────────────────────────
  courses: (params?: Record<string, string>) =>
    apiFetch<ListResponse<AdminCourse>>(
      `/api/admin/courses${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  createCourse: (body: Partial<AdminCourse>) =>
    apiFetch<{ success: boolean; data: AdminCourse }>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCourse: (id: string, body: Partial<AdminCourse>) =>
    apiFetch<{ success: boolean; data: AdminCourse }>(`/api/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCourse: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/courses/${id}`, { method: 'DELETE' }),

  // ── Bills ─────────────────────────────────────────────────────────────────
  billStats: () =>
    apiFetch<{ success: boolean; data: BillStats }>('/api/admin/bills/stats'),
  bills: (params?: Record<string, string>) =>
    apiFetch<ListResponse<Bill>>(
      `/api/admin/bills${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  createBill: (body: Partial<Bill>) =>
    apiFetch<{ success: boolean; data: Bill }>('/api/admin/bills', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBill: (id: string, body: Partial<Bill>) =>
    apiFetch<{ success: boolean; data: Bill }>(`/api/admin/bills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteBill: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/bills/${id}`, { method: 'DELETE' }),
  sendBillReminders: () =>
    apiFetch<{ success: boolean; message: string; sent?: number }>('/api/admin/bills/reminders', { method: 'POST' }),
  exportBills: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    window.location.href = `/api/admin/bills/export${qs}`;
  },
  uploadBillFile: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/bills/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok()}` },
      body: fd,
    });
    const json = await res.json().catch(() => ({ error: 'Invalid response' }));
    if (!res.ok) throw new Error(json.error ?? 'Upload failed');
    return json as { success: boolean; fileUrl: string; fileName: string; fileType: string; fileSize: number };
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: (params?: Record<string, string>) =>
    apiFetch<ListResponse<AuditLog>>(
      `/api/admin/audit-logs${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
};
