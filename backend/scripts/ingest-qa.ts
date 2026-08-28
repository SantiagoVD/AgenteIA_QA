import { join } from "node:path";
import { loadQAGuidelines } from "../src/qa/QAGuidelineLoader.ts";
import { QAVectorStore } from "../src/qa/QAVectorStore.ts";
const guidelines = await loadQAGuidelines(join(process.cwd(), "knowledge", "qa"));
await QAVectorStore.open(guidelines, join(process.cwd(), "data", "qa-vector-store.json"));
console.log(`QA ingestion completed: ${guidelines.length} guidelines indexed.`);
