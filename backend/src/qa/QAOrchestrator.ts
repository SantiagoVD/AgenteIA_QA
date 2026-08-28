import type { ComplianceFinding } from "../models/Compliance.ts";
import type { AgentContext } from "./QAAgent.ts";
import type { ILLMProvider } from "../llm/ILLMProvider.ts";
import { GeneralQAAgent, ProductQualityAgent, TestingAgent, SecurityAgent } from "./SpecializedAgents.ts";
export async function runQAAgents(context: AgentContext, llm?: ILLMProvider): Promise<ComplianceFinding[]> { const agents = [new GeneralQAAgent(llm), new ProductQualityAgent(llm), new TestingAgent(llm), new SecurityAgent(llm)]; return (await Promise.all(agents.map(agent => agent.run(context)))).flat(); }
