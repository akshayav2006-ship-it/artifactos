import { useEffect, useState } from 'react';
import { geminiModels, groqModels } from '../../shared/ai';
import type { AIModel, AIRequest } from '../../shared/ai';
import { localAI } from './aiClient';

type Status = { accounts: { id: string; email: string; connected: boolean }[]; active?: string; signingIn: boolean; error: string };
export default function AIControls({ local, value, onChange, busy, apiKey: key, setApiKey: setKey }: { local: boolean; value?: AIRequest; onChange: (value?: AIRequest) => void; busy: boolean; apiKey: string; setApiKey: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>(value && !geminiModels.some(m => m.id === value.model.id) ? [...geminiModels, value.model] : geminiModels);
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [custom, setCustom] = useState('');
  const supported = local && import.meta.env.DEV;
  const hostedNotebook = local && !import.meta.env.DEV;
  async function refresh() {
    const next = await localAI<Status>('status');
    setStatus(next);
    setError(next.error || "");
    if (next.active) {
      const available = await localAI<AIModel[]>('models');
      setModels(current => [...current.filter(m => m.provider === "gemini"), ...available]);
    } else setModels(current => current.filter(m => m.provider === "gemini"));
  }
  useEffect(() => {
    if (!supported || !open) return;
    let disposed = false;
    const poll = async () => {
      try {
        const next = await localAI<Status>('status');
        if (disposed) return;
        setStatus(next);
        setError(next.error || "");
        if (next.active) {
          const available = await localAI<AIModel[]>('models');
          if (!disposed) setModels(current => [...current.filter(m => m.provider === "gemini"), ...available]);
        }
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : 'Connection unavailable.'); }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [supported, open]);
  async function connect(accountId?: string) {
    // Open synchronously so browser popup blockers allow the OAuth window.
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError('Allow popups to connect ChatGPT.'); return; }
    popup.opener = null;
    setWorking(true); setError('');
    try { const result = await localAI<{ url: string }>('connect', { accountId }); popup.location.href = result.url; await refresh(); }
    catch (e) { popup.close(); setError(e instanceof Error ? e.message : 'Sign-in failed.'); }
    finally { setWorking(false); }
  }
  const active = status?.accounts.find(a => a.id === status.active);
  return <div className="ai-controls">
    <div className="ai-picker-row">
      <label>Model
        <select aria-label="AI model" disabled={busy} value={value ? `${value.model.provider}:${value.model.id}` : ''} onChange={e => {
          const model = [...models, ...groqModels].find(m => `${m.provider}:${m.id}` === e.target.value);
          onChange(model ? { model, apiKey: model.provider === 'gemini' ? key : undefined, googleSearch: model.provider === 'gemini' ? value?.googleSearch : undefined } : undefined);
        }}>
          <option value="">Notebook · save only</option>
          {!local && <optgroup label="Groq · hosted connection">{groqModels.map(m => <option key={m.id} value={`groq:${m.id}`}>{m.name}</option>)}</optgroup>}
          <optgroup label="Google Gemini · AI Studio key" disabled={hostedNotebook}>
            {models.filter(m => m.provider === 'gemini').map(m => <option key={m.id} value={`gemini:${m.id}`}>{m.name}</option>)}
          </optgroup>
          {models.some(m => m.provider === 'chatgpt') && <optgroup label="ChatGPT · your plan">
            {models.filter(m => m.provider === 'chatgpt').map(m => <option key={m.id} value={`chatgpt:${m.id}`}>{m.name}</option>)}
          </optgroup>}
        </select>
      </label>
      <button type="button" className="subtle" aria-expanded={open} onClick={() => setOpen(!open)}>⚙ AI connections</button>
    </div>
    {hostedNotebook && <p className="connection-note">Sign in to a shared workspace to use Gemini. This personal notebook saves prompts and manually attached results on this device.</p>}
    {value?.model.provider === 'gemini' && <label className="google-search-toggle">
      <input type="checkbox" checked={value.googleSearch ?? false} disabled={busy} onChange={e => onChange({ ...value, googleSearch: e.target.checked })} />
      Ground with Google Search
      <small>Searches when useful and includes sources. Search usage may incur charges.</small>
    </label>}
    {open && <div className="ai-connections">
      <div>
        <strong>Gemini · test with a free-tier key</strong>
        <p>Create a key in <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio ↗</a>. Free-tier availability and limits depend on the model, region, and project billing.</p>
        <label>Gemini API key
          <input type="password" autoComplete="off" spellCheck={false} placeholder="Paste your AI Studio key" value={key} disabled={busy} onChange={e => {
            setKey(e.target.value);
            if (value?.model.provider === 'gemini') onChange({ ...value, apiKey: e.target.value });
          }} />
        </label>
        <small>Kept in memory for this workspace session. Sent to the backend only when you request a reply.</small>
        <label>Other Gemini model ID
          <div className="ai-picker-row"><input placeholder="gemini-…" value={custom} onChange={e => setCustom(e.target.value)} /><button type="button" className="secondary" disabled={busy || !/^gemini-[a-z0-9.-]+$/.test(custom)} onClick={() => {
            const model: AIModel = { id: custom, name: custom, provider: 'gemini' };
            setModels(current => [...current.filter(m => m.id !== custom), model]); onChange({ model, apiKey: key, googleSearch: value?.googleSearch });
          }}>Use model</button></div>
        </label>
      </div>
      <div>
        <strong>ChatGPT · use your plan</strong>
        {supported ? <>
          <p>{active ? `Connected: ${active.email} · ${active.id.slice(-8)}` : 'Connect an eligible ChatGPT account and authorize plan usage. Your available models will appear above.'}</p>
          <button type="button" className="secondary" disabled={busy || working || status?.signingIn} onClick={() => void connect()}>Continue with ChatGPT</button>
          {status?.accounts.map(account => <button type="button" className="subtle" key={account.id} disabled={busy || working || status.signingIn} onClick={() => void connect(account.id)}>Reconnect {account.email} · {account.id.slice(-8)}</button>)}
          {active && <button type="button" className="subtle" disabled={busy || working} onClick={async () => {
            setWorking(true);
            try { const result = await localAI<{ message: string }>('disconnect'); if (value?.model.provider === 'chatgpt') onChange(undefined); await refresh(); setError(result.message); }
            catch (e) { setError(e instanceof Error ? e.message : 'Disconnect failed.'); }
            finally { setWorking(false); }
          }}>Disconnect</button>}
          {status?.signingIn && <p role="status">Finish signing in in the ChatGPT tab. This panel updates automatically.</p>}
          <p><a href="https://chatgpt.com/#settings" target="_blank" rel="noreferrer">Manage plan usage and app access in ChatGPT Settings ↗</a></p>
        </> : <p>ChatGPT plan sign-in is available in the local workspace with <code>npm run dev</code>. Hosted website sign-in requires OpenAI partner registration. Gemini works in signed-in workspaces.</p>}
      </div>
      {error && <p role="status" className="connection-note">{error}</p>}
    </div>}
    {value?.model.provider === 'gemini' && !key && <p className="connection-note">Open AI connections and add your Gemini API key before sending.</p>}
  </div>;
}
