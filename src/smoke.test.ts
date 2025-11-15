import { describe, test, expect } from 'bun:test';
import { z } from 'zod';
import { LogseqParser } from './indexing/logseq-parser.js';
import { LogseqChunker } from './indexing/chunker.js';
import type { LogseqPage, DocumentChunk, SearchResult } from './types.js';
import { mockJournalContent, mockPageContent, mockEnv } from './test/helpers.js';

describe('Config Validation', () => {
  test('should validate config schema with all required fields', () => {
    const ConfigSchema = z.object({
      openai: z.object({
        apiKey: z.string().min(1),
        embeddingModel: z.string().default('text-embedding-3-small'),
        embeddingDimensions: z.coerce.number().default(1536),
      }),
      anthropic: z.object({
        apiKey: z.string().min(1),
        model: z.string().default('claude-haiku-4-5-20251001'),
      }),
      qdrant: z.object({
        url: z.string().url().default('http://localhost:6333'),
        collectionName: z.string().default('logseq-dnd-notes'),
      }),
      logseq: z.object({
        path: z.string().min(1),
      }),
      chunking: z.object({
        chunkSize: z.coerce.number().default(800),
        chunkOverlap: z.coerce.number().default(200),
      }),
      query: z.object({
        topK: z.coerce.number().default(100),
      }),
    });

    const result = ConfigSchema.parse({
      openai: {
        apiKey: mockEnv.OPENAI_API_KEY,
        embeddingModel: mockEnv.EMBEDDING_MODEL,
        embeddingDimensions: mockEnv.EMBEDDING_DIMENSIONS,
      },
      anthropic: {
        apiKey: mockEnv.ANTHROPIC_API_KEY,
        model: mockEnv.CLAUDE_MODEL,
      },
      qdrant: {
        url: mockEnv.QDRANT_URL,
        collectionName: mockEnv.QDRANT_COLLECTION_NAME,
      },
      logseq: {
        path: mockEnv.LOGSEQ_PATH,
      },
      chunking: {
        chunkSize: mockEnv.CHUNK_SIZE,
        chunkOverlap: mockEnv.CHUNK_OVERLAP,
      },
      query: {
        topK: mockEnv.TOP_K_RESULTS,
      },
    });

    expect(result.openai.apiKey).toBe('test-openai-key');
    expect(result.anthropic.apiKey).toBe('test-anthropic-key');
    expect(result.qdrant.url).toBe('http://localhost:6333');
    expect(result.chunking.chunkSize).toBe(800);
  });

  test('should apply default values when optional fields are missing', () => {
    const ConfigSchema = z.object({
      openai: z.object({
        apiKey: z.string().min(1),
        embeddingModel: z.string().default('text-embedding-3-small'),
        embeddingDimensions: z.coerce.number().default(1536),
      }),
      qdrant: z.object({
        url: z.string().url().default('http://localhost:6333'),
        collectionName: z.string().default('logseq-dnd-notes'),
      }),
    });

    const result = ConfigSchema.parse({
      openai: {
        apiKey: 'test-key',
      },
      qdrant: {},
    });

    expect(result.openai.embeddingModel).toBe('text-embedding-3-small');
    expect(result.openai.embeddingDimensions).toBe(1536);
    expect(result.qdrant.url).toBe('http://localhost:6333');
    expect(result.qdrant.collectionName).toBe('logseq-dnd-notes');
  });

  test('should reject invalid config values', () => {
    const ConfigSchema = z.object({
      qdrant: z.object({
        url: z.string().url(),
      }),
    });

    expect(() => {
      ConfigSchema.parse({
        qdrant: {
          url: 'not-a-url',
        },
      });
    }).toThrow();
  });
});

describe('LogseqParser', () => {
  const parser = new LogseqParser('/mock/path');

  test('should extract page links from content', () => {
    const content = 'This mentions [[Caelum Fenovar]] and [[Phylactery]]';
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]!);
    }

    expect(links).toEqual(['Caelum Fenovar', 'Phylactery']);
  });

  test('should extract block refs from content', () => {
    const content = 'Reference to ((abc123-def456)) and ((fedcba-654321))';
    const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;
    const refs: string[] = [];
    let match;

    while ((match = blockRefRegex.exec(content)) !== null) {
      refs.push(match[1]!);
    }

    expect(refs).toEqual(['abc123-def456', 'fedcba-654321']);
  });

  test('should parse journal date from filename', () => {
    const parseJournalDate = (filename: string): Date | undefined => {
      const match = filename.match(/^(\d{4})_(\d{2})_(\d{2})$/);
      if (!match || !match[1] || !match[2] || !match[3]) return undefined;

      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };

    const date = parseJournalDate('2024_12_27');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(11); // December is month 11 (0-indexed)
    expect(date?.getDate()).toBe(27);
  });

  test('should return undefined for invalid journal filename', () => {
    const parseJournalDate = (filename: string): Date | undefined => {
      const match = filename.match(/^(\d{4})_(\d{2})_(\d{2})$/);
      if (!match || !match[1] || !match[2] || !match[3]) return undefined;

      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };

    expect(parseJournalDate('invalid-date')).toBeUndefined();
    expect(parseJournalDate('2024-12-27')).toBeUndefined(); // Wrong separator
  });

  test('should handle multiple page links and deduplicate', () => {
    const content = '[[Caelum]] mentioned [[Phylactery]] and [[Caelum]] again';
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]!);
    }

    const uniqueLinks = [...new Set(links)];
    expect(uniqueLinks).toEqual(['Caelum', 'Phylactery']);
  });
});

describe('LogseqChunker', () => {
  test('should chunk simple bullet list', () => {
    const chunker = new LogseqChunker(800, 200);
    const mockPage: LogseqPage = {
      path: '/mock/test.md',
      filename: 'test',
      type: 'page',
      content: mockJournalContent,
      metadata: {
        title: 'Test Page',
        pageLinks: ['Caelum Fenovar', 'Phylactery', 'Theron'],
        blockRefs: ['abc123-def456'],
      },
    };

    const chunks = chunker.chunkPage(mockPage);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.content).toBeTruthy();
    expect(chunks[0]!.id).toBeTruthy();
    expect(chunks[0]!.metadata.source).toBe('/mock/test.md');
    expect(chunks[0]!.metadata.type).toBe('page');
    expect(chunks[0]!.metadata.title).toBe('Test Page');
  });

  test('should preserve hierarchical bullet structure', () => {
    const chunker = new LogseqChunker(800, 200);
    const hierarchicalContent = `- Parent item
\t- Child item 1
\t\t- Grandchild item
\t- Child item 2`;

    const mockPage: LogseqPage = {
      path: '/mock/hierarchical.md',
      filename: 'hierarchical',
      type: 'page',
      content: hierarchicalContent,
      metadata: {
        title: 'Hierarchical',
        pageLinks: [],
        blockRefs: [],
      },
    };

    const chunks = chunker.chunkPage(mockPage);

    expect(chunks[0]!.content).toContain('Parent item');
    expect(chunks[0]!.content).toContain('Child item 1');
    expect(chunks[0]!.content).toContain('Grandchild item');
  });

  test('should handle empty content', () => {
    const chunker = new LogseqChunker(800, 200);
    const mockPage: LogseqPage = {
      path: '/mock/empty.md',
      filename: 'empty',
      type: 'page',
      content: '',
      metadata: {
        title: 'Empty',
        pageLinks: [],
        blockRefs: [],
      },
    };

    const chunks = chunker.chunkPage(mockPage);

    expect(chunks.length).toBe(0);
  });

  test('should assign chunk indices and total counts', () => {
    const chunker = new LogseqChunker(100, 20); // Small chunk size to force multiple chunks
    const longContent = Array(10)
      .fill(0)
      .map((_, i) => `- Item ${i} with some content to make it longer`)
      .join('\n');

    const mockPage: LogseqPage = {
      path: '/mock/long.md',
      filename: 'long',
      type: 'page',
      content: longContent,
      metadata: {
        title: 'Long',
        pageLinks: [],
        blockRefs: [],
      },
    };

    const chunks = chunker.chunkPage(mockPage);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.metadata.chunkIndex).toBe(index);
      expect(chunk.metadata.totalChunks).toBeGreaterThan(0);
    });
  });
});

describe('Type Safety', () => {
  test('DocumentChunk should have correct structure', () => {
    const chunk: DocumentChunk = {
      id: 'test-id',
      content: 'test content',
      metadata: {
        source: '/test/path.md',
        type: 'page',
        title: 'Test',
        pageLinks: ['Link1'],
        chunkIndex: 0,
        totalChunks: 1,
      },
    };

    expect(chunk.id).toBe('test-id');
    expect(chunk.metadata.type).toBe('page');
    expect(chunk.metadata.chunkIndex).toBe(0);
  });

  test('SearchResult should have correct structure', () => {
    const result: SearchResult = {
      chunk: {
        id: 'test-id',
        content: 'test content',
        metadata: {
          source: '/test/path.md',
          type: 'journal',
          title: 'Test',
          date: '2024-12-27',
          pageLinks: [],
          chunkIndex: 0,
          totalChunks: 1,
        },
      },
      score: 0.95,
    };

    expect(result.score).toBe(0.95);
    expect(result.chunk.metadata.type).toBe('journal');
    expect(result.chunk.metadata.date).toBe('2024-12-27');
  });

  test('LogseqPage should have correct structure', () => {
    const page: LogseqPage = {
      path: '/test/2024_12_27.md',
      filename: '2024_12_27',
      type: 'journal',
      date: new Date('2024-12-27'),
      content: '- Test content',
      metadata: {
        title: 'December 27, 2024',
        pageLinks: ['Page1', 'Page2'],
        blockRefs: ['ref-123'],
      },
    };

    expect(page.type).toBe('journal');
    expect(page.date).toBeInstanceOf(Date);
    expect(page.metadata.pageLinks.length).toBe(2);
  });
});
