const getApiBase = () =>
  (typeof window !== "undefined" &&
    (
      window as unknown as { __HHU_CHAT_API_BASE__?: string }
    ).__HHU_CHAT_API_BASE__) ||
  "/api";

/* ---------- types ---------- */

export type UserRole = "admin" | "user";
export type UserStatusValue = 0 | 1;

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatusValue;
  createTime: string;
}

export interface UserListParams {
  page: number;
  size: number;
  keyword?: string;
  role?: string;
  status?: string;
}

export interface UserPageResult {
  records: UserRecord[];
  total: number;
  current: number;
  size: number;
  pages?: number;
}

export interface UserUpdatePayload {
  email: string;
  role: string;
}

export interface UserStatusPayload {
  status: UserStatusValue;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/* ---------- fetch wrapper ---------- */

async function request<T>(
  path: string,
  options?: RequestInit & {
    token?: string;
    params?: Record<string, string | number | undefined>;
  },
): Promise<T> {
  const base = getApiBase().replace(/\/$/, "");
  let url = `${base}${path}`;

  // build query string
  if (options?.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== "" && v !== null) {
        sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const { params: _params, ...fetchOpts } = options ?? {};

  const res = await fetch(url, { ...fetchOpts, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "请求失败" }));
    const err = new Error(
      body.message || body.detail || `HTTP ${res.status}`,
    ) as Error & { httpStatus?: number; bizCode?: number };
    err.httpStatus = res.status;
    if (body.code) err.bizCode = body.code;
    throw err;
  }

  const body: ApiEnvelope<T> = await res.json();

  if (body.code && body.code !== 200) {
    const err = new Error(body.message || "请求失败") as Error & {
      httpStatus?: number;
      bizCode?: number;
    };
    err.bizCode = body.code;
    throw err;
  }

  return body.data;
}

/* ---------- public API ---------- */

export function getUserList(
  token: string,
  params: UserListParams,
): Promise<UserPageResult> {
  return request<UserPageResult>("/user/list", {
    token,
    params: {
      page: params.page,
      size: params.size,
      keyword: params.keyword,
      role: params.role,
      status: params.status,
    },
  });
}

export function updateUser(
  token: string,
  id: number,
  payload: UserUpdatePayload,
): Promise<UserRecord> {
  return request<UserRecord>(`/user/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateUserStatus(
  token: string,
  id: number,
  status: UserStatusValue,
): Promise<UserRecord> {
  return request<UserRecord>(`/user/${id}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status }),
  });
}

export function deleteUser(token: string, id: number): Promise<null> {
  return request<null>(`/user/${id}`, {
    method: "DELETE",
    token,
  });
}
