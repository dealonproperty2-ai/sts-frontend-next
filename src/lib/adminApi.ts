export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  isActive: boolean;
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

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

function tok(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sts-admin-token') ?? '';
}

async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tok()}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => ({ error: 'Invalid response' }));

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      localStorage.removeItem('sts-admin-token');
      localStorage.removeItem('sts-admin-user');
      window.location.href = '/admin/login';
    }
    throw new Error(json.error ?? 'Unauthorized');
  }

  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

export const adminApi = {
  // Auth — uses raw fetch so a 401 wrong-password never triggers the auto-redirect
  login: async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({ error: 'Invalid response' }));
    if (!res.ok) throw new Error(json.error ?? 'Login failed');
    return json as { success: boolean; token: string; user: AdminUser };
  },

  me: () =>
    apiFetch<{ success: boolean; data: AdminUser }>('/api/admin/me'),

  // Dashboard
  stats: () =>
    apiFetch<{ success: boolean; data: StatsData }>('/api/admin/stats'),

  // Applications
  applications: (params?: Record<string, string>) =>
    apiFetch<ListResponse<Application>>(
      `/api/admin/applications${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  application: (id: string) =>
    apiFetch<{ success: boolean; data: Application }>(`/api/admin/applications/${id}`),
  updateApplication: (id: string, body: { status?: string; adminNotes?: string }) =>
    apiFetch<{ success: boolean; data: Application }>(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteApplication: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/applications/${id}`, { method: 'DELETE' }),

  // Enquiries
  enquiries: (params?: Record<string, string>) =>
    apiFetch<ListResponse<Enquiry>>(
      `/api/admin/enquiries${params ? `?${new URLSearchParams(params)}` : ''}`
    ),
  enquiry: (id: string) =>
    apiFetch<{ success: boolean; data: Enquiry }>(`/api/admin/enquiries/${id}`),
  updateEnquiry: (id: string, body: { status: string }) =>
    apiFetch<{ success: boolean; data: Enquiry }>(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteEnquiry: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/enquiries/${id}`, { method: 'DELETE' }),

  // Users
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

  // Courses
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
};
