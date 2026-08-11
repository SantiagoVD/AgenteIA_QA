import { join } from "node:path";
import { chunkText } from "../../../ingestion/Chunker.ts";
import { loadPdf } from "../../../ingestion/PdfLoader.ts";
//recibir los chunks, generar embeddings, guardar vectores y permitir la busqueda por similitud
import { CloudVectorStore } from "./CloudVectorStore.ts";

export class CloudEmbeddingPipeline {
  private store?: Promise<CloudVectorStore>;

  build(): Promise<CloudVectorStore> {
    //Si todavía no existe una promesa de construcción,
    //inicia el pipeline y guárdala, Si ya existe, devuelve la misma promesa.
    return this.store ??= loadPdf(
      join(
        process.cwd(),
        "documents",
        "cloud",
        "Cloud_Architecture_Guidelines_RAG.pdf"
      )
    )
      .then(chunkText)
      .then(chunks => new CloudVectorStore(chunks));
  }
}
