# Codebase Structure

## Directory Layout
```
src/
├── indexing/           # Indexing pipeline: Logseq → Qdrant
│   ├── logseq-parser.ts   - Parses markdown, extracts dates, page links [[Name]], block refs ((uuid))
│   ├── chunker.ts         - Preserves Logseq bullet hierarchy, creates ~800 token chunks with overlap
│   └── indexer.ts         - Batches embeddings (100/request), upserts to Qdrant with metadata
├── querying/           # Query pipeline: Question → Answer
│   ├── retriever.ts       - Semantic search via cosine similarity, date-range filtering
│   └── query-handler.ts   - Claude integration with streaming, D&D-specific system prompt
├── config.ts           # Zod-validated configuration from .env
├── types.ts            # Type definitions: LogseqPage → DocumentChunk → SearchResult
├── sync.ts             # Entry point for indexing commands
├── query.ts            # Entry point for query commands
└── index.ts            # Main entry point (dev mode)
```

## Data Flow Pipeline
```
Logseq Files
  ↓ [LogseqParser]
LogseqPage[] (with metadata: dates, links, block refs)
  ↓ [LogseqChunker]
DocumentChunk[] (~800 tokens, hierarchical structure preserved)
  ↓ [VectorIndexer + OpenAI]
Qdrant Points (1536-dim vectors + metadata payload)
  ↓ [VectorRetriever + Query]
SearchResult[] (chunks + relevance scores)
  ↓ [ClaudeQueryHandler]
Streamed Answer
```

## Key Design Principles
- **Logseq-Specific**: Journals parsed as dates (YYYY_MM_DD.md), hierarchical bullets preserved
- **Chunking**: Semantic sections, not arbitrary token splits (preserves parent-child context)
- **Incremental Sync**: Full file reindex when any change detected
- **Metadata**: All chunk metadata stored in Qdrant payloads (source, date, title, links, chunk index)
