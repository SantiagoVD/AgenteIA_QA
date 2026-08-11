export const environment = {
  port: Number(process.env.PORT ?? 3001),
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, ""),
  ollamaModel: process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3-vl:4b",
  maxArchitectureImageBytes: Number(process.env.MAX_ARCHITECTURE_IMAGE_MB ?? 10) * 1024 * 1024,
  documentsPath: new URL("../../documents/", import.meta.url),
};
