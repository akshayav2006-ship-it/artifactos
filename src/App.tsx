import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type AiModel = 'ChatGPT' | 'Claude 3' | 'Gemini' | 'Canva AI'

type ArtifactType = 'chat' | 'upload'

type ReviewStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Rejected'

type Artifact = {
  id: string
  type: ArtifactType
  title: string
  model?: AiModel
  prompt?: string
  response?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  createdBy: string
  createdAt: string
  version: number
  reviewStatus: ReviewStatus
  trustScore: number
}

const STORAGE_KEY = 'artifactos-chat-artifacts'

const models: AiModel[] = ['ChatGPT', 'Claude 3', 'Gemini', 'Canva AI']

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mockAiResponse(prompt: string, model: AiModel) {
  const base = `This is a generated response from ${model}.`
  const guidance = prompt.length > 80 ? ' Thanks for the detailed prompt!' : ' Share more context for a finer result.'
  return `${base} ${guidance}`
}

function App() {
  const [selectedModel, setSelectedModel] = useState<AiModel>('ChatGPT')
  const [prompt, setPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState<Artifact[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [isSending, setIsSending] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('No files uploaded yet.')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Artifact[]
        setArtifacts(parsed)
        setChatHistory(parsed.filter((artifact) => artifact.type === 'chat'))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts))
  }, [artifacts])

  const handleSend = async () => {
    if (!prompt.trim()) return

    setIsSending(true)
    const promptText = prompt.trim()
    const createdAt = new Date().toISOString()
    const newArtifact: Artifact = {
      id: makeId('artifact'),
      type: 'chat',
      title: `Chat with ${selectedModel}`,
      model: selectedModel,
      prompt: promptText,
      response: undefined,
      createdBy: 'You',
      createdAt,
      version: 1,
      reviewStatus: 'Draft',
      trustScore: 68,
    }

    setArtifacts((current) => [newArtifact, ...current])
    setPrompt('')

    await new Promise((resolve) => setTimeout(resolve, 400))
    const aiResponse = mockAiResponse(promptText, selectedModel)
    const completedArtifact: Artifact = {
      ...newArtifact,
      response: aiResponse,
      title: `Chat with ${selectedModel}`,
      trustScore: 74,
    }

    setArtifacts((current) => [completedArtifact, ...current.filter((item) => item.id !== newArtifact.id)])
    setChatHistory((history) => [completedArtifact, ...history])
    setIsSending(false)
  }

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const uploaded: Artifact[] = []

    Array.from(files).forEach((file) => {
      uploaded.push({
        id: makeId('upload'),
        type: 'upload',
        title: `Uploaded ${file.name}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        version: 1,
        reviewStatus: 'Draft',
        trustScore: 50,
      })
    })

    setArtifacts((current) => [...uploaded, ...current])
    setUploadMessage(`${files.length} file(s) added as artifact(s).`)
    event.target.value = ''
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="badge">Artifactos</p>
          <h1>Multi-AI Chat Workspace</h1>
          <p className="subtitle">
            Chat with any model and let Artifactos save every prompt, response, and upload automatically.
          </p>
        </div>
        <div className="workspace-stats">
          <div>
            <strong>{artifacts.length}</strong>
            <span>Artifacts</span>
          </div>
          <div>
            <strong>{artifacts.filter((a) => a.type === 'chat').length}</strong>
            <span>Chats</span>
          </div>
        </div>
      </header>

      <section className="workspace-grid">
        <section className="panel chat-panel">
          <div className="panel-header">
            <div>
              <h2>New AI Conversation</h2>
              <p>Choose a model, type a prompt, and Artifactos saves the conversation automatically.</p>
            </div>
            <div className="model-select">
              <label htmlFor="ai-model">AI Model</label>
              <select
                id="ai-model"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value as AiModel)}
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            className="prompt-input"
            rows={6}
            placeholder="Type your prompt here..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <div className="chat-actions">
            <label className="file-upload">
              Upload files
              <input type="file" multiple onChange={handleUpload} />
            </label>
            <button type="button" onClick={handleSend} disabled={isSending || !prompt.trim()}>
              {isSending ? 'Sending...' : 'Send Prompt'}
            </button>
          </div>

          <p className="upload-note">{uploadMessage}</p>

          <div className="chat-history">
            <div className="history-header">
              <h3>Recent chats</h3>
              <span>{chatHistory.length} saved</span>
            </div>
            {chatHistory.length === 0 ? (
              <p className="empty-state">No chat artifacts yet. Send your first prompt to start.</p>
            ) : (
              chatHistory.map((chat) => (
                <article key={chat.id} className="chat-card">
                  <div className="chat-card-title">
                    <strong>{chat.title}</strong>
                    <span>{formatDate(chat.createdAt)}</span>
                  </div>
                  <p className="chat-card-meta">Model: {chat.model} · Status: {chat.reviewStatus}</p>
                  <div className="chat-message">
                    <p className="message-label">Prompt</p>
                    <p>{chat.prompt}</p>
                  </div>
                  <div className="chat-message response">
                    <p className="message-label">Response</p>
                    <p>{chat.response}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="panel artifact-panel">
          <div className="panel-header">
            <h2>Artifact storage</h2>
            <p>Every chat and upload is kept as an artifact with provenance and version details.</p>
          </div>

          <div className="artifact-list">
            {artifacts.length === 0 ? (
              <p className="empty-state">Artifacts appear here as you chat and upload files.</p>
            ) : (
              artifacts.slice(0, 8).map((artifact) => (
                <div key={artifact.id} className="artifact-card">
                  <div>
                    <strong>{artifact.title}</strong>
                    <p>{formatDate(artifact.createdAt)}</p>
                  </div>
                  <div className="artifact-meta">
                    <span>{artifact.type === 'upload' ? 'Upload' : artifact.model}</span>
                    <span>v{artifact.version}</span>
                  </div>
                  {artifact.fileName ? (
                    <p className="artifact-file">{artifact.fileName}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
