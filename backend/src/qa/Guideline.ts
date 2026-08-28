import type { Priority } from "../models/Compliance.ts";
export interface QAGuideline { guidelineId: string; title: string; domain: "General QA" | "Product Quality" | "Testing" | "Security"; source: string; sourceVersion: string; priority: Priority; tags: string[]; text: string; }
