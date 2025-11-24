import router from "@/router";

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

  const tokenToUse =
    overrideToken ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

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
