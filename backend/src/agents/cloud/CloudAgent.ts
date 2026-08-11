import type { ILLMProvider } from "../../llm/ILLMProvider.ts";
import { BaseAgent } from "../shared/BaseAgent.ts";
import { cloudSystemPrompt } from "./SystemPrompt.ts";
import { CloudRetriever } from "./rag/CloudRetriever.ts";

export class CloudAgent extends BaseAgent {
  constructor(
    llm: ILLMProvider,
    retriever = new CloudRetriever()
  ) {
    super(
      llm,
      "Cloud",
      cloudSystemPrompt,
      (question) => retriever.retrieve(question),
      (queries) => retriever.retrieveMany(queries)
    );
  }
}