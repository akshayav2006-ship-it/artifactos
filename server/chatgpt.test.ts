// @vitest-environment node
import { expect, test } from 'vitest';
import { readReplyStream } from './chatgpt';
function stream(parts: string[]) {
  return new ReadableStream<Uint8Array>({ start(controller) {
    for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
    controller.close();
  } });
}
test('ChatGPT requires a completed event and handles split SSE frames', async () => {
  const result = await readReplyStream(stream([
    'data: {"type":"response.output_text.delta","delta":"Hello"}\r',
    '\n\r\n',
    'data: {"type":"response.completed"}\n\n',
  ]));
  expect(result).toBe('Hello');
});
test('partial ChatGPT output is never treated as a successful reply', async () => {
  await expect(readReplyStream(stream(['data: {"type":"response.output_text.delta","delta":"Partial"}\n\n']))).rejects.toThrow('interrupted');
});
test('ChatGPT plan limits after output starts fail without leaking provider details', async () => {
  await expect(readReplyStream(stream([
    'data: {"type":"response.output_text.delta","delta":"Partial"}\n\n',
    'data: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}}\n\n',
  ]))).rejects.toThrow('Check plan limits');
});
