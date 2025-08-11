export const isAdmin = (user?: any): boolean => {
  if (!user) return false
  if (user.role && String(user.role).toLowerCase() === 'admin') return true
  if (Array.isArray(user.roles) && user.roles.some((r: any) => String(r).toLowerCase() === 'admin')) return true
  try {
    const token = localStorage.getItem('jwt')
    if (!token) return false
    const payload = JSON.parse(atob((token.split('.')[1] || ''))) || {}
    const candidates = [
      payload?.role,
      payload?.roles,
      payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      payload?.['roles'],
    ].filter(Boolean)
    const flat = ([] as any[]).concat(...candidates)
    return flat.some((r) => String(r).toLowerCase() === 'admin')
  } catch {
    return false
  }
}
