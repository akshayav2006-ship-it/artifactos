import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import { v } from "convex/values";
const app = defineApp({ env: { GROQ_API_KEY: v.optional(v.string()), OPENROUTER_API_KEY: v.optional(v.string()) } });
app.use(agent);
export default app;
