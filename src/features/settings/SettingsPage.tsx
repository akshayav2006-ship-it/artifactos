import { useEffect, useState } from 'react'
import './SettingsPage.css'

type Settings = { enterToSend: boolean; compactMode: boolean; showSources: boolean; defaultTone: 'balanced' | 'concise' | 'detailed' }
const defaults: Settings = { enterToSend: false, compactMode: false, showSources: true, defaultTone: 'balanced' }
const storageKey = 'artifactos-settings'

export function SettingsPage({ local, modelName, geminiConfigured = false }: { local?: boolean; modelName?: string; geminiConfigured?: boolean }) {
  const [settings, setSettings] = useState<Settings>(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') } } catch { return defaults } })
  const [saved, setSaved] = useState(false)
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(settings)); setSaved(true); const timer = window.setTimeout(() => setSaved(false), 1600); return () => window.clearTimeout(timer) }, [settings])
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(current => ({ ...current, [key]: value }))
  return <section className="settings-page">
    <header className="settings-header"><div><p className="eyebrow">Settings</p><h2>Make Artifactos work your way</h2><p className="settings-intro">Personalize your workspace, chat behavior, and AI defaults.</p></div><span className={`settings-save ${saved ? 'is-visible' : ''}`}>Saved automatically</span></header>
    <div className="settings-grid">
      <section className="settings-card"><div className="card-heading"><div><p className="card-kicker">CHAT PREFERENCES</p><h3>How should chats behave?</h3></div><span className="settings-icon">✦</span></div><div className="settings-options">
        <label className="settings-option"><span><strong>Press Enter to send</strong><small>Use Shift + Enter for a new line.</small></span><input type="checkbox" checked={settings.enterToSend} onChange={e => update('enterToSend', e.target.checked)} /></label>
        <label className="settings-option"><span><strong>Show sources when available</strong><small>Keep Google Search citations visible in AI replies.</small></span><input type="checkbox" checked={settings.showSources} onChange={e => update('showSources', e.target.checked)} /></label>
        <label className="settings-option"><span><strong>Compact workspace</strong><small>Reduce spacing to see more prompts and results.</small></span><input type="checkbox" checked={settings.compactMode} onChange={e => update('compactMode', e.target.checked)} /></label>
      </div></section>
      <section className="settings-card"><p className="card-kicker">AI DEFAULTS</p><h3>Your starting point</h3><label className="settings-field">Response style<select value={settings.defaultTone} onChange={e => update('defaultTone', e.target.value as Settings['defaultTone'])}><option value="balanced">Balanced</option><option value="concise">Concise</option><option value="detailed">Detailed</option></select></label><div className="status-row"><span>Selected model</span><strong>{modelName || 'Notebook · save only'}</strong></div><a className="settings-action" href="/workspace?page=chat">Open AI model connections <span>↗</span></a></section>
      <section className="settings-card"><p className="card-kicker">WORKSPACE</p><h3>Current environment</h3><div className="environment"><span className="status-dot" />{local === false ? 'Shared workspace' : 'Local workspace'}</div><p className="settings-muted">{local === false ? 'Projects and permissions are managed securely through the connected workspace.' : 'Your prompts and preferences are stored in this browser while working locally.'}</p><a className="settings-action" href="/workspace?page=projects">Manage projects <span>↗</span></a></section>
      <section className="settings-card integration-card"><div className="card-heading"><div><p className="card-kicker">INTEGRATIONS</p><h3>Connected services</h3></div><span className="connection-count">{geminiConfigured ? '1 connected' : '0 connected'}</span></div><div className="integration-row"><div className="integration-mark">G</div><div><strong>Google Gemini</strong><small>{geminiConfigured ? 'API key available for this session' : 'Add a key from the Chat workspace'}</small></div><a href="/workspace?page=chat">Manage</a></div><div className="integration-row"><div className="integration-mark chatgpt-mark">✳</div><div><strong>ChatGPT plan</strong><small>Connect locally from AI connections</small></div><a href="/workspace?page=chat">Connect</a></div></section>
    </div><p className="settings-footer">Preferences are saved automatically on this device.</p>
  </section>
}
