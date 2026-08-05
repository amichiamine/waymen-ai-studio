import { API_BASE_URL, API_TIMEOUT_MS, AUTH_STRATEGY } from "./config";
import type { ApiEnvelope, ApiErrorBody } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Access token en mémoire (jamais en localStorage) pour la stratégie bearer. */
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Pour les uploads : envoie un FormData sans Content-Type JSON. */
  formData?: FormData;
};

function buildUrl(path: string, query?: Record<string, unknown>) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, formData, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (!formData && body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (AUTH_STRATEGY === "bearer" && accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  try {
    const res = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      credentials: AUTH_STRATEGY === "cookie" ? "include" : "same-origin",
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = (parsed as ApiErrorBody | null)?.error;
      throw new ApiError(
        res.status,
        err?.code ?? `http_${res.status}`,
        err?.message ?? res.statusText ?? "Erreur réseau",
        err?.fields,
      );
    }

    // Supporte les réponses enveloppées `{ data }` ou brutes.
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return (parsed as ApiEnvelope<T>).data;
    }
    return parsed as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") {
      throw new ApiError(408, "timeout", "La requête a expiré.");
    }
    throw new ApiError(0, "network_error", (e as Error).message || "Serveur injoignable.");
  } finally {
    clearTimeout(timeout);
  }
}

export const http = {
  get: <T>(path: string, query?: Record<string, unknown>, o?: RequestOptions) =>
    apiRequest<T>(path, { ...o, method: "GET", query }),
  post: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    apiRequest<T>(path, { ...o, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    apiRequest<T>(path, { ...o, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, o?: RequestOptions) =>
    apiRequest<T>(path, { ...o, method: "PUT", body }),
  del: <T>(path: string, o?: RequestOptions) =>
    apiRequest<T>(path, { ...o, method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: "POST", formData }),
};
