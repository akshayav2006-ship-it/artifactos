import { SignIn, SignUp } from '@clerk/react';
import { useSearchParams } from 'react-router-dom';
import './LoginPage.css';

export function AuthLanding({ continueLocally }: { continueLocally?: () => void }) {
  const [params, setParams] = useSearchParams();
  const creating = params.get('mode') === 'signup';
  const appearance = { elements: { rootBox: { width: '100%' }, cardBox: { width: '100%', boxShadow: 'none' }, card: { boxShadow: 'none', border: 'none', width: '100%' }, footerAction: { display: 'none' }, footer: { background: 'transparent' } } };
  return <div className="auth-page"><div className="auth-shell">
    <section className="auth-hero"><span className="auth-badge">✳ Artifactos</span><h1>A shared home for your AI work.</h1><p>Chat with AI, create documents, and organize your work into projects. Keep useful replies as artifacts, track each version, and bring teammates into review.</p><ul className="auth-highlights"><li>Choose from Groq, OpenRouter, and Gemini.</li><li>Create PDFs and commit replies directly from chat.</li><li>Keep project history and review decisions together.</li></ul></section>
    <section className="auth-card" aria-label={creating ? 'Create an account' : 'Log in'}>
      {creating ? <SignUp routing="hash" signInUrl="/login" forceRedirectUrl="/workspace" appearance={appearance} /> : <SignIn routing="hash" signUpUrl="/login?mode=signup" forceRedirectUrl="/workspace" appearance={appearance} />}
      <p className="auth-footer">{creating ? 'Already have an account? ' : 'Don’t have an account? '}<button type="button" className="auth-switch" onClick={() => setParams(creating ? {} : { mode: 'signup' })}>{creating ? 'Log in' : 'Create account'}</button></p>
      {continueLocally && <button type="button" className="auth-local" onClick={continueLocally}>Continue locally</button>}
    </section>
  </div></div>;
}
