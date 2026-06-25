import Cookies from 'js-cookie';

const AUTH_PRESENT_COOKIE = 'vx_auth_present';
const CSRF_COOKIE = 'vx_csrf';

export function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return Cookies.get(AUTH_PRESENT_COOKIE);
}

export function setToken(csrfToken?: string): void {
  Cookies.remove('admin_token');
  if (csrfToken) {
    Cookies.set(CSRF_COOKIE, csrfToken, {
      expires: 30,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  Cookies.set(AUTH_PRESENT_COOKIE, 'true', {
    expires: 30,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function removeToken(): void {
  Cookies.remove('admin_token');
  Cookies.remove('authToken');
  Cookies.remove(AUTH_PRESENT_COOKIE);
  Cookies.remove(CSRF_COOKIE);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
