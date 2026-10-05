import { expect, test } from "vitest";
import { localActions } from "./local";
import { emptyData } from "../../shared/workspace";
test("multiple local commits are independent and only pushed commits become artifacts", async () => {
  let data = structuredClone(emptyData);
  const a = localActions(
    () => data,
    (next) => {
      data = next;
    },
  );
  const project = await a.createProject("Research", "A description");
  const chat = await a.createChat("", "New chat");
  await a.sendPrompt(chat, "Explore ideas");
  await a.assignChat(chat, project);
  const prompt = data.prompts[0];
  await a.addResult(prompt.id, "First result");
  await a.commit(chat, prompt.id, "Draft A", "First result", "Initial draft");
  await a.commit(chat, prompt.id, "Draft B", "Better result", "Refinement");
  expect(data.artifacts).toHaveLength(0);
  await a.push(data.commits[1].id);
  expect(data.artifacts).toHaveLength(1);
  expect(data.artifacts[0].body).toBe("First result");
  expect(data.prompts[0].projectId).toBe(project);
  await expect(a.assignChat(chat, "")).rejects.toThrow("locked");
  await expect(
    a.review(data.artifacts[0].id, "verified", 100, "Self review"),
  ).rejects.toThrow("self-verified");
});

test('local AI sends conversation context and stores provider replies without credentials', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'AI chat');
  await a.sendPrompt(chat, 'First question');
  await a.addResult(data.prompts[0].id, 'First answer');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: 'Second answer' }), { headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chat, 'Follow up', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' }, apiKey: 'private-key' });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).messages).toEqual([
      { role: 'user', content: 'First question' }, { role: 'assistant', content: 'First answer' }, { role: 'user', content: 'Follow up' },
    ]);
    expect(data.prompts[1]).toMatchObject({ status: 'complete', result: 'Second answer', model: 'Gemini' });
    expect(JSON.stringify(data)).not.toContain('private-key');
  } finally { request.mockRestore(); }
});

test('local provider failure preserves the prompt for retry', async () => {
  const { vi } = await import('vitest');
  let data = structuredClone(emptyData);
  const a = localActions(() => data, next => { data = next; });
  const chat = await a.createChat('', 'AI chat');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  try {
    await a.sendPrompt(chat, 'Keep my prompt', { model: { id: 'gemini-2.5-flash', name: 'Gemini', provider: 'gemini' }, apiKey: 'private-key' });
    expect(data.prompts[0]).toMatchObject({ text: 'Keep my prompt', status: 'failed', error: 'Quota exceeded' });
  } finally { request.mockRestore(); }
});
