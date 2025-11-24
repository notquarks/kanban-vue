import router from "@/router";
import { useAuthStore } from "@/stores/auth";

const API_BASE_URL = "http://localhost:3001/api";

let isRedirecting = false;

export async function apiRequest(
  url: string,
  options: RequestInit = {},
  overrideToken?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  let tokenToUse = overrideToken;

  if (!tokenToUse && typeof window !== "undefined") {
    try {
      const authStore = useAuthStore();
      tokenToUse =
        authStore.token || localStorage.getItem("token") || undefined;
    } catch {
      tokenToUse = localStorage.getItem("token") || undefined;
    }
  }

  if (tokenToUse) {
    headers.Authorization = `Bearer ${tokenToUse}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const responseData = await response.json();

  if (!response.ok) {
    if (response.status === 401 && !isRedirecting) {
      isRedirecting = true;

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      await router.push("/login");

      setTimeout(() => {
        isRedirecting = false;
      }, 1000);
    }

    throw new Error(
      responseData.error || `HTTP error! status: ${response.status}`,
    );
  }

  return responseData;
}

export const api = {
  get: (url: string) => apiRequest(url, { method: "GET" }),
  post: (url: string, body: unknown) =>
    apiRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (url: string, body: unknown) =>
    apiRequest(url, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  patch: (url: string, body: unknown) =>
    apiRequest(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (url: string) => apiRequest(url, { method: "DELETE" }),
};
