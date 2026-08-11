import type { ILLMProvider } from "../../llm/ILLMProvider.ts";
import { BaseAgent } from "../shared/BaseAgent.ts";
import { integrationSystemPrompt } from "./SystemPrompt.ts";
import { IntegrationRetriever } from "./rag/IntegrationRetriever.ts";

export class IntegrationAgent extends BaseAgent {
  constructor(llm: ILLMProvider, retriever = new IntegrationRetriever()) {
    super(llm, "Integration", integrationSystemPrompt, (question) => retriever.retrieve(question), (queries) => retriever.retrieveMany(queries));
  }
}
