import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ChatMessage } from '../shared/ai.ts';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const directory = join(homedir(), '.config', 'artifactos');
const file = join(directory, 'chatgpt.json');
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
type Account = { clientId: string; subject: string; email: string; access?: string; refresh?: string; idToken?: string; expires?: number; scope?: string };
type Store = { host: string; active?: string; accounts: Account[] };
let store: Store;
let refreshing: Promise<Account> | undefined;
let signingIn = false;
let signInError = '';
async function load() {
  if (store) return store;
  try { store = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    store = { host: `urn:uuid:${randomUUID()}`, accounts: [] };
    await save();
  }
  return store;
}
async function save() {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}`;
  await writeFile(temporary, JSON.stringify(store), { mode: 0o600 });
  await rename(temporary, file);
}
async function exchange(body: URLSearchParams) {
  const response = await fetch(`${issuer}/api/accounts/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('ChatGPT authorization expired or was rejected. Please sign in again.');
  const token = await response.json() as { access_token?: unknown; expires_in?: unknown; refresh_token?: unknown; id_token?: unknown; scope?: unknown };
  if (typeof token.access_token !== 'string' || typeof token.expires_in !== 'number') throw new Error('Invalid ChatGPT token response.');
  return { access_token: token.access_token, expires_in: token.expires_in,
    refresh_token: typeof token.refresh_token === 'string' ? token.refresh_token : undefined,
    id_token: typeof token.id_token === 'string' ? token.id_token : undefined,
    scope: typeof token.scope === 'string' ? token.scope : undefined };
}
export async function status() {
  const data = await load();
  return { accounts: data.accounts.map(a => ({ id: a.clientId, email: a.email, connected: !!a.access })), active: data.active, signingIn, error: signInError };
}
export async function authorize(accountId?: string) {
  const data = await load();
  if (signingIn) throw new Error('A ChatGPT sign-in is already open. Complete it or wait for it to expire.');
  const account = accountId ? data.accounts.find(a => a.clientId === accountId) : undefined;
  if (accountId && !account) throw new Error('Unknown ChatGPT account.');
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  let redirectUri = '';
  let consumed = false;
  const server = createServer(async (req, res) => {
    const callback = new URL(req.url || '/', redirectUri);
    if (callback.pathname !== '/auth/callback') { res.writeHead(404).end(); return; }
    if (consumed || callback.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid sign-in state.'); return; }
    consumed = true;
    try {
      if (callback.searchParams.has('error')) throw new Error('ChatGPT sign-in was declined.');
      const clientId = callback.searchParams.get('client_id') || account?.clientId;
      const code = callback.searchParams.get('code');
      if (!code || !clientId || clientId === 'dynamic_agent_client' || (account && clientId !== account.clientId)) throw new Error('Invalid ChatGPT registration.');
      const token = await exchange(new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier, redirect_uri: redirectUri, resource }));
      if (!token.id_token) throw new Error("Missing ChatGPT identity token.");
      const { payload } = await jwtVerify(token.id_token, jwks, { issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5 });
      if (payload.nonce !== nonce || !payload.sub || (account && payload.sub !== account.subject)) throw new Error('ChatGPT identity could not be verified.');
      if (!String(token.scope).split(' ').includes('chatgpt.tokens.use.direct')) throw new Error('ChatGPT plan usage was not authorized. Sign in again and allow plan usage.');
      const next: Account = { clientId, subject: payload.sub, email: typeof payload.email === 'string' ? payload.email : 'ChatGPT account', access: token.access_token, refresh: token.refresh_token, idToken: token.id_token, expires: Date.now() + token.expires_in * 1000, scope: token.scope };
      data.accounts = [...data.accounts.filter(a => a.clientId !== clientId), next];
      data.active = clientId;
      await save();
      signInError = '';
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('ChatGPT connected to Artifactos. You can close this tab and return to your workspace.');
    } catch (error) {
      signInError = error instanceof Error ? error.message : 'ChatGPT sign-in failed.';
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end(signInError);
    } finally { clearTimeout(timer); signingIn = false; server.close(); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Cannot start ChatGPT callback.');
  redirectUri = `http://127.0.0.1:${address.port}/auth/callback`;
  signingIn = true;
  signInError = '';
  const timer = setTimeout(() => { signingIn = false; signInError = 'ChatGPT sign-in timed out. Please try again.'; server.close(); }, 10 * 60 * 1000);
  timer.unref();
  const params = new URLSearchParams({ client_id: account?.clientId || 'dynamic_agent_client', ext_agent_host_id: data.host, response_type: 'code', redirect_uri: redirectUri, scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct', resource, state, nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
  if (!account) params.set('agent_name_hint', 'Artifactos');
  if (account?.idToken) params.set('id_token_hint', account.idToken);
  return { url: `${issuer}/api/accounts/authorize?${params}` };
}
async function credentials(): Promise<Account> {
  const data = await load();
  const account = data.accounts.find(a => a.clientId === data.active);
  if (!account?.access) throw new Error('Connect ChatGPT first.');
  if ((account.expires || 0) > Date.now() + 60000) return account;
  if (!refreshing) refreshing = (async () => {
    if (!account.refresh) throw new Error('Please reconnect ChatGPT.');
    const token = await exchange(new URLSearchParams({ grant_type: 'refresh_token', client_id: account.clientId, refresh_token: account.refresh, resource }));
    const scope = token.scope ?? account.scope;
    if (!String(scope).split(' ').includes('chatgpt.tokens.use.direct')) throw new Error('ChatGPT plan permission is missing. Reconnect your account.');
    Object.assign(account, { access: token.access_token, refresh: token.refresh_token || account.refresh, scope, expires: Date.now() + token.expires_in * 1000 });
    await save(); return account;
  })().finally(() => { refreshing = undefined; });
  return refreshing;
}
export async function models() {
  const account = await credentials();
  const response = await fetch(`${resource}/models`, { headers: { Authorization: `Bearer ${account.access}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Cannot load ChatGPT models. Reconnect your account and check plan access.');
  const body = await response.json() as { models?: { visibility: string; slug: string; display_name: string }[] };
  if (!Array.isArray(body.models)) throw new Error('ChatGPT model catalog is unavailable.');
  return body.models.filter((m: { visibility: string }) => m.visibility === 'list').map((m: { slug: string; display_name: string }) => ({ id: m.slug, name: m.display_name, provider: 'chatgpt' }));
}
export async function disconnect() {
  if (signingIn || refreshing) throw new Error('Wait for ChatGPT sign-in or refresh to finish.');
  const data = await load();
  const account = data.accounts.find(a => a.clientId === data.active);
  let revoked = !account?.refresh;
  if (account?.refresh) {
    try {
      const discovery = await (await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10000) })).json() as { revocation_endpoint: string };
      const endpoint = new URL(discovery.revocation_endpoint);
      if (endpoint.origin !== issuer) throw new Error('Invalid revocation endpoint.');
      revoked = (await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ token: account.refresh, token_type_hint: 'refresh_token', client_id: account.clientId }), signal: AbortSignal.timeout(10000) })).ok;
    } catch { revoked = false; }
  }
  if (account) { delete account.access; delete account.refresh; delete account.idToken; delete account.expires; delete account.scope; }
  delete data.active;
  await save();
  return { message: revoked ? 'ChatGPT disconnected.' : 'Disconnected locally. Remote revocation was not confirmed; disconnect Artifactos in ChatGPT Settings.' };
}
export async function reply(model: string, input: ChatMessage[], signal?: AbortSignal) {
  const available = await models();
  if (!available.some((m: { id: string }) => m.id === model)) throw new Error('Choose an available ChatGPT model.');
  const account = await credentials();
  const response = await fetch(`${resource}/responses`, { method: 'POST', headers: { Authorization: `Bearer ${account.access}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, store: false, stream: true, ...(model === 'gpt-5.6-luna' ? { reasoning: { effort: 'none' } } : {}) }), signal: signal ?? AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) throw new Error(`ChatGPT request failed (${response.status}). Check your plan usage or reconnect.`);
  return readReplyStream(response.body);
}
export async function readReplyStream(body: ReadableStream<Uint8Array>) {
  let buffer = '', output = '', completed = false;
  let resolvedModel: string | undefined;
  const decoder = new TextDecoder();
  for await (const chunk of body) {
    buffer = (buffer + decoder.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
      const raw = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!raw || raw === '[DONE]') continue;
      const event = JSON.parse(raw);
      if (event.type === 'response.output_text.delta') output += event.delta;
      if (['response.failed', 'response.incomplete', 'error'].includes(event.type)) throw new Error('ChatGPT could not complete this reply. Check plan limits in ChatGPT Settings and try again.');
      if (event.type === 'response.completed') {
        completed = true;
        if (typeof event.response?.model === 'string') resolvedModel = event.response.model;
      }
    }
  }
  if (!completed || !output.trim()) throw new Error('ChatGPT response was interrupted or empty. Please try again.');
  return { text: output, resolvedModel };
}
