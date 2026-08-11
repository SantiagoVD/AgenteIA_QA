import { constants } from "../../../config/constants.ts";
import { retrieveGuidelines, type RetrievedGuideline } from "../../shared/RetrievedGuideline.ts";
import { InfrastructureEmbeddingPipeline } from "./InfrastructureEmbeddingPipeline.ts";

export class InfrastructureRetriever {
  private readonly pipeline: InfrastructureEmbeddingPipeline;
  constructor(pipeline = new InfrastructureEmbeddingPipeline()) { this.pipeline = pipeline; }
  async retrieve(question: string): Promise<string[]> { return (await this.pipeline.build()).search(question, constants.topK); }
  async retrieveMany(queries: string[]): Promise<RetrievedGuideline[]> {
    const store = await this.pipeline.build();
    return retrieveGuidelines(store.search("", 10_000), queries, "Infrastructure_Architecture_Guidelines_RAG.pdf", constants.validationTopKPerQuery, constants.validationRuleLimit);
  }
}
