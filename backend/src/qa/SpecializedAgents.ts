import { QAAgent, type AgentContext, type QADomain } from "./QAAgent.ts";
import type { ComplianceFinding } from "../models/Compliance.ts";
import type { ILLMProvider } from "../llm/ILLMProvider.ts";
export class GeneralQAAgent extends QAAgent { constructor(llm?: ILLMProvider) { super("General QA", llm); } }
export class ProductQualityAgent extends QAAgent { constructor(llm?: ILLMProvider) { super("Product Quality", llm); } }
export class TestingAgent extends QAAgent { constructor(llm?: ILLMProvider) { super("Testing", llm); } }
export class SecurityAgent extends QAAgent { constructor(llm?: ILLMProvider) { super("Security", llm); } }
export type SpecializedAgent = { run(context: AgentContext): Promise<ComplianceFinding[]> };
export const specializedDomains: QADomain[] = ["General QA", "Product Quality", "Testing", "Security"];
