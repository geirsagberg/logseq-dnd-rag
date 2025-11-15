import { OpenAI } from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { DocumentChunk } from '../types.js';
import { config } from '../config.js';

export class VectorIndexer {
  private openai: OpenAI;
  private qdrant: QdrantClient;
  private collectionName: string;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.qdrant = new QdrantClient({ url: config.qdrant.url });
    this.collectionName = config.qdrant.collectionName;
  }

  async initializeCollection(): Promise<void> {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        console.log(`Creating collection: ${this.collectionName}`);
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: config.openai.embeddingDimensions,
            distance: 'Cosine',
          },
        });
        console.log('Collection created successfully');
      } else {
        console.log(`Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      console.error('Failed to initialize collection:', error);
      throw error;
    }
  }

  async indexChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) {
      console.log('No chunks to index');
      return;
    }

    console.log(`Indexing ${chunks.length} chunks...`);

    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.indexBatch(batch);
      console.log(`Indexed ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`);
    }

    console.log('Indexing complete!');
  }

  private async indexBatch(chunks: DocumentChunk[]): Promise<void> {
    const embeddings = await this.generateEmbeddings(
      chunks.map((c) => c.content)
    );

    const points = chunks.map((chunk, index) => ({
      id: chunk.id,
      vector: embeddings[index]!,
      payload: {
        content: chunk.content,
        source: chunk.metadata.source,
        type: chunk.metadata.type,
        title: chunk.metadata.title,
        date: chunk.metadata.date,
        pageLinks: chunk.metadata.pageLinks,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
      },
    }));

    await this.qdrant.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: texts,
        dimensions: config.openai.embeddingDimensions,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async deleteChunksFromSource(sourcePath: string): Promise<void> {
    await this.qdrant.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: 'source',
            match: { value: sourcePath },
          },
        ],
      },
    });
  }

  async getCollectionInfo(): Promise<void> {
    try {
      const info = await this.qdrant.getCollection(this.collectionName);
      console.log('Collection Info:', {
        name: this.collectionName,
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
      });
    } catch (error) {
      console.error('Failed to get collection info:', error);
    }
  }
}
