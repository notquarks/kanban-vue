const API_BASE_URL = 'http://localhost:3001/api'

export async function apiRequest(url: string, options: RequestInit = {}, overrideToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }


  let tokenToUse = overrideToken
  if (!tokenToUse && typeof window !== 'undefined') {
    tokenToUse = localStorage.getItem('token')
  }


  if (tokenToUse && tokenToUse.trim() !== '') {
    headers.Authorization = `Bearer ${tokenToUse}`
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  })

  const responseData = await response.json()

  if (!response.ok) {
    const errorData = responseData
    if (response.status === 401) {
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      authStore.logout()
    }
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  return responseData
}


export const api = {
  get: (url: string) => apiRequest(url, { method: 'GET' }),
  post: (url: string, body: unknown) => apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  put: (url: string, body: unknown) => apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  patch: (url: string, body: unknown) => apiRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  delete: (url: string) => apiRequest(url, { method: 'DELETE' }),
}
