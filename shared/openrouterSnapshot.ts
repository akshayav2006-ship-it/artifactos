import type { AIModel } from './ai';
// OpenRouter public models API, checked 2026-10-30. Fallback for catalog outages.
export const openRouterSnapshotDate = '2026-10-30';
export const openRouterSnapshot: AIModel[] = [
  {
    "id": "cohere/north-mini-code:free",
    "name": "Cohere: North Mini Code (free)",
    "provider": "openrouter"
  },
  {
    "id": "dots-studio/dots-3-note-preview:free",
    "name": "Dots Studio: Dots3-Note Preview (free)",
    "provider": "openrouter"
  },
  {
    "id": "openrouter/free",
    "name": "Free Models Router",
    "provider": "openrouter"
  },
  {
    "id": "google/gemma-4-26b-a4b-it:free",
    "name": "Google: Gemma 4 26B A4B  (free)",
    "provider": "openrouter"
  },
  {
    "id": "google/gemma-4-31b-it:free",
    "name": "Google: Gemma 4 31B (free)",
    "provider": "openrouter"
  },
  {
    "id": "liquid/lfm-2.5-2.6b:free",
    "name": "LiquidAI: LFM2.5-2.6B (free)",
    "provider": "openrouter"
  },
  {
    "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "name": "NVIDIA: Nemotron 3 Nano Omni (free)",
    "provider": "openrouter"
  },
  {
    "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "name": "NVIDIA: Nemotron 3 Ultra (free)",
    "provider": "openrouter"
  },
  {
    "id": "nvidia/nemotron-3.5-lightning:free",
    "name": "NVIDIA: Nemotron 3.5 Lightning (free)",
    "provider": "openrouter"
  },
  {
    "id": "nvidia/nemotron-3.5-super-vl:free",
    "name": "NVIDIA: Nemotron 3.5 Super VL (free)",
    "provider": "openrouter"
  },
  {
    "id": "poolside/laguna-s-2.1:free",
    "name": "Poolside: Laguna S 2.1 (free)",
    "provider": "openrouter"
  },
  {
    "id": "poolside/laguna-xs-2.1:free",
    "name": "Poolside: Laguna XS 2.1 (free)",
    "provider": "openrouter"
  },
  {
    "id": "recursive/flint-v1.0:free",
    "name": "Recursive: Flint (free)",
    "provider": "openrouter"
  },
  {
    "id": "thinkingmachines/inkling:free",
    "name": "Thinking Machines: Inkling (free)",
    "provider": "openrouter"
  },
  {
    "id": "thinkingmachines/inkling-small:free",
    "name": "Thinking Machines: Inkling Small (free)",
    "provider": "openrouter"
  },
  {
    "id": "xingchen-agi/xing4.0-29b-a4b:free",
    "name": "XingChen: Xing4.0 29B A4B (free)",
    "provider": "openrouter"
  }
];
