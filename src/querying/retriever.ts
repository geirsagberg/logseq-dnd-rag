import { OpenAI } from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { SearchResult, DocumentChunk } from '../types.js';
import { config } from '../config.js';

export class VectorRetriever {
  private openai: OpenAI;
  private qdrant: QdrantClient;
  private collectionName: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.qdrant = new QdrantClient({ url: config.qdrant.url });
    this.collectionName = config.qdrant.collectionName;
  }

  async search(query: string, topK: number = config.query.topK): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateQueryEmbedding(query);

    const searchResults = await this.qdrant.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    });

    return searchResults.map((result) => {
      const payload = result.payload as any;

      return {
        chunk: {
          id: result.id as string,
          content: payload.content,
          metadata: {
            source: payload.source,
            type: payload.type,
            title: payload.title,
            date: payload.date,
            pageLinks: payload.pageLinks || [],
            chunkIndex: payload.chunkIndex,
            totalChunks: payload.totalChunks,
          },
        },
        score: result.score,
      };
    });
  }

  async searchByDate(
    query: string,
    dateFrom?: Date,
    dateTo?: Date,
    topK: number = config.query.topK
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateQueryEmbedding(query);

    const filter: any = {
      must: [],
    };

    if (dateFrom) {
      filter.must.push({
        key: 'date',
        range: {
          gte: dateFrom.toISOString(),
        },
      });
    }

    if (dateTo) {
      filter.must.push({
        key: 'date',
        range: {
          lte: dateTo.toISOString(),
        },
      });
    }

    const searchResults = await this.qdrant.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
      filter: filter.must.length > 0 ? filter : undefined,
      with_payload: true,
    });

    return searchResults.map((result) => {
      const payload = result.payload as any;

      return {
        chunk: {
          id: result.id as string,
          content: payload.content,
          metadata: {
            source: payload.source,
            type: payload.type,
            title: payload.title,
            date: payload.date,
            pageLinks: payload.pageLinks || [],
            chunkIndex: payload.chunkIndex,
            totalChunks: payload.totalChunks,
          },
        },
        score: result.score,
      };
    });
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: query,
      dimensions: config.openai.embeddingDimensions,
    });

    return response.data[0]!.embedding;
  }
}
