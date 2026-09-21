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
