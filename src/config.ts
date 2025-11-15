import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const ConfigSchema = z.object({
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
    embeddingModel: z.string().default('text-embedding-3-small'),
    embeddingDimensions: z.coerce.number().default(1536),
  }),
  anthropic: z.object({
    apiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
    model: z.string().default('claude-haiku-4-5-20251001'),
  }),
  qdrant: z.object({
    url: z.string().url().default('http://localhost:6333'),
    collectionName: z.string().default('logseq-dnd-notes'),
  }),
  logseq: z.object({
    path: z.string().min(1, 'LOGSEQ_PATH is required'),
  }),
  chunking: z.object({
    chunkSize: z.coerce.number().default(800),
    chunkOverlap: z.coerce.number().default(200),
  }),
  query: z.object({
    topK: z.coerce.number().default(100),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export const config: Config = ConfigSchema.parse({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL,
    embeddingDimensions: process.env.EMBEDDING_DIMENSIONS,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL,
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    collectionName: process.env.QDRANT_COLLECTION_NAME,
  },
  logseq: {
    path: process.env.LOGSEQ_PATH,
  },
  chunking: {
    chunkSize: process.env.CHUNK_SIZE,
    chunkOverlap: process.env.CHUNK_OVERLAP,
  },
  query: {
    topK: process.env.TOP_K_RESULTS,
  },
});
