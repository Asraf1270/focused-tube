import { supabase } from './client';

export async function requireAuth(to, from, next) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Redirect to login with return URL
    return {
      pathname: '/login',
      search: `?redirect=${encodeURIComponent(to.pathname)}`,
    };
  }
  
  return next();
}

export async function redirectIfAuthenticated(to, from, next) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    return { pathname: '/' };
  }
  
  return next();
}