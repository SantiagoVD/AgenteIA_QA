import type { ILLMProvider } from "../../llm/ILLMProvider.ts";
import { BaseAgent } from "../shared/BaseAgent.ts";
import { infrastructureSystemPrompt } from "./SystemPrompt.ts";
import { InfrastructureRetriever } from "./rag/InfrastructureRetriever.ts";

export class InfrastructureAgent extends BaseAgent {
  constructor(llm: ILLMProvider, retriever = new InfrastructureRetriever()) {
    super(llm, "Infrastructure", infrastructureSystemPrompt, (question) => retriever.retrieve(question), (queries) => retriever.retrieveMany(queries));
  }
}
