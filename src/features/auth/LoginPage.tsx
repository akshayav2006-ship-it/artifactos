import { ClerkProvider, useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { AuthLanding } from './AuthLanding';

function LoginContent() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="auth-page"><p>Loading sign-in…</p></div>;
  if (isSignedIn) return <Navigate to="/workspace" replace />;
  return <AuthLanding />;
}
export function LoginPage() {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!key) return <div className="auth-page"><p>Account sign-in is not configured. <a href="/workspace">Open the local workspace</a>.</p></div>;
  return <ClerkProvider publishableKey={key}><LoginContent /></ClerkProvider>;
}
