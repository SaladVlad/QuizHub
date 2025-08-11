export const buildHeaders = (acceptJson = true): Record<string, string> => {
  const headers: Record<string, string> = {}
  if (acceptJson) headers['Accept'] = 'application/json'
  const token = localStorage.getItem('jwt')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export const handleApiError = async (response: Response): Promise<never> => {
  if (response.status === 401 && localStorage.getItem('jwt')) {
    try {
      localStorage.removeItem('jwt')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
    } catch {}
    try {
      window.location.assign('/login')
    } catch {}
  }
  let message = response.statusText || 'Request failed'
  try {
    const data = await response.json()
    if (data?.message) message = data.message
  } catch {}
  const error = new Error(message) as Error & { status?: number }
  error.status = response.status
  throw error
}
