import { constants } from "../../../config/constants.ts";
import { retrieveGuidelines, type RetrievedGuideline } from "../../shared/RetrievedGuideline.ts";
import { IntegrationEmbeddingPipeline } from "./IntegrationEmbeddingPipeline.ts";

export class IntegrationRetriever {
  private readonly pipeline: IntegrationEmbeddingPipeline;
  constructor(pipeline = new IntegrationEmbeddingPipeline()) { this.pipeline = pipeline; }
  async retrieve(question: string): Promise<string[]> { return (await this.pipeline.build()).search(question, constants.topK); }
  async retrieveMany(queries: string[]): Promise<RetrievedGuideline[]> {
    const store = await this.pipeline.build();
    return retrieveGuidelines(store.search("", 10_000), queries, "Integration_Architecture_Guidelines_RAG.pdf", constants.validationTopKPerQuery, constants.validationRuleLimit);
  }
}
