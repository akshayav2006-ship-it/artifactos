export async function localAI<T>(path: string, body: unknown = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/ai/${path}`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'X-Artifactos-AI': '1' }, body: JSON.stringify(body) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Local AI requires npm run dev on localhost. Sign in to use Gemini in the hosted workspace.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'AI request failed.');
  return data;
}
