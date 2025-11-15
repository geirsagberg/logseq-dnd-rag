# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **RAG (Retrieval-Augmented Generation)** system for querying D&D campaign notes stored in Logseq. It indexes markdown files into a vector database (Qdrant) and uses Claude to answer questions based on retrieved context.

**Key Technology Stack**:
- TypeScript + Bun runtime
- OpenAI text-embedding-3-small (embeddings)
- Qdrant vector database (Docker)
- Claude Haiku 4.5 (LLM)
- Logseq markdown (source format)

## Essential Commands

### Development
```bash
bun typecheck           # Type check without building
bun run build           # Compile TypeScript to dist/
bun install             # Install dependencies
```

### Running the System
```bash
# Start Qdrant vector database
docker compose up -d

# Index Logseq notes
bun sync full           # Full reindex of all notes
bun sync incremental    # Only index files modified in last 24 hours

# Query the system
bun query "question"                    # Ask a question
bun query "question" --show-context     # Show retrieved chunks
bun query "question" --top-k 50         # Retrieve 50 chunks instead of default
bun query "question" --no-stream        # Non-streaming response
```

### Qdrant Database
```bash
docker compose up -d               # Start Qdrant
docker compose down                # Stop Qdrant
curl http://localhost:6333/collections/logseq-dnd-notes  # Check collection status
```

## Architecture

### Two-Phase Pipeline

**Indexing Phase** (Logseq → Qdrant):
1. `LogseqParser` reads journals/ and pages/ directories
2. `LogseqChunker` preserves hierarchical bullet structure (~800 tokens/chunk)
3. `VectorIndexer` generates embeddings via OpenAI and stores in Qdrant

**Query Phase** (Question → Answer):
1. `VectorRetriever` embeds query and searches Qdrant for top-K similar chunks
2. `ClaudeQueryHandler` formats context and streams response from Claude

### Core Components

**Indexing** (`src/indexing/`):
- `logseq-parser.ts` - Parses markdown, extracts dates from filenames (YYYY_MM_DD), page links `[[Name]]`, and block refs `((uuid))`
- `chunker.ts` - Preserves Logseq bullet hierarchy, creates semantic chunks with overlap
- `indexer.ts` - Batches embeddings (100/request), upserts to Qdrant with metadata

**Querying** (`src/querying/`):
- `retriever.ts` - Semantic search via cosine similarity, supports date-range filtering
- `query-handler.ts` - Claude integration with streaming, D&D-specific system prompt

**Configuration** (`src/config.ts`):
- Zod-validated schema from .env
- All API keys, paths, and parameters configured via environment variables

**Types** (`src/types.ts`):
- `LogseqPage` → `DocumentChunk` → `SearchResult` transformation pipeline
- Rich metadata: source path, dates, page links, chunk indices

### Data Flow

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

### Logseq-Specific Parsing
- **Journals**: Filenames like `2024_12_27.md` → parsed as dates for timeline queries
- **Hierarchical bullets**: Tab-indented structure preserved during chunking (not naive token splitting)
- **Syntax extraction**: `[[Page Links]]` and `((block-refs))` stored in metadata for future graph queries

### Chunking Strategy
The chunker parses Logseq's bullet tree structure and groups by semantic sections rather than arbitrary token counts. This preserves parent-child context (e.g., a sub-bullet about "Caelum's beliefs" stays connected to "Caelum Fenovar" parent bullet).

### Incremental Sync
When a file changes, the entire file is reindexed (all chunks deleted, then re-chunked and re-embedded). This avoids stale chunk boundaries but means incremental sync reprocesses full files, not diffs.

### Metadata in Vector Payloads
All chunk metadata (source path, date, title, page links, chunk index) is stored directly in Qdrant payloads. This enables:
- Date-range filtering
- Source attribution in responses
- Reconstruction of SearchResults without a separate database

## Configuration & Environment

All configuration is in `.env` (see `.env.example`):

**Required**:
- `OPENAI_API_KEY` - For embeddings
- `ANTHROPIC_API_KEY` - For Claude responses
- `LOGSEQ_PATH` - Full path to Logseq directory (must contain journals/ and pages/)

**Optional** (with defaults):
- `QDRANT_URL=http://localhost:6333` - Change for cloud migration
- `QDRANT_COLLECTION_NAME=logseq-dnd-notes`
- `EMBEDDING_MODEL=text-embedding-3-small`
- `EMBEDDING_DIMENSIONS=1536`
- `CHUNK_SIZE=800` - Target tokens per chunk
- `CHUNK_OVERLAP=200` - Token overlap between chunks
- `TOP_K_RESULTS=100` - Default chunks retrieved per query
- `CLAUDE_MODEL=claude-haiku-4-5-20251001`

## Working with the Codebase

### Adding New Logseq Syntax Support
If Logseq adds new syntax (e.g., `{{embed}}`), update `LogseqParser.extractPageLinks()` or add new extraction methods. The metadata is stored in `LogseqPage.metadata` and flows through to `DocumentChunk.metadata`.

### Changing Chunking Strategy
Modify `LogseqChunker.chunkPage()`. The interface is:
```typescript
chunkPage(page: LogseqPage): DocumentChunk[]
```
The chunker must return chunks with `id`, `content`, and `metadata` fields. See `src/types.ts`.

### Swapping Vector Database
To use Pinecone/ChromaDB instead of Qdrant:
1. Update `VectorIndexer` (src/indexing/indexer.ts) - `initializeCollection()`, `indexBatch()`
2. Update `VectorRetriever` (src/querying/retriever.ts) - `search()` method
3. Both use the same `DocumentChunk` and `SearchResult` types

### Changing LLM
To use GPT-4 instead of Claude:
1. Replace `@anthropic-ai/sdk` with `openai` in `ClaudeQueryHandler`
2. Update `query()` and `streamQuery()` methods
3. Adjust system prompt for different model behavior

### Date Filtering Queries
`VectorRetriever` has `searchByDate(query, dateFrom, dateTo, topK)` for timeline queries. This uses Qdrant metadata filters. See `src/querying/retriever.ts`.

## Testing Queries

After making changes, test with:
```bash
bun query "Who is Caelum Fenovar?" --show-context
```

The `--show-context` flag displays retrieved chunks with relevance scores, helping verify:
- Chunking preserves semantic meaning
- Embeddings capture query intent
- Metadata is correctly attached

## Qdrant Migration (Local → Cloud)

To migrate from local Docker to Qdrant Cloud:
1. Sign up at cloud.qdrant.io
2. Update `.env`:
   ```
   QDRANT_URL=https://your-cluster.cloud.qdrant.io
   QDRANT_API_KEY=your-api-key
   ```
3. Run `bun sync full` to reindex to cloud

No code changes required - the `QdrantClient` handles both local and cloud connections.

## Cost Considerations

- **Initial indexing (~12 MB notes)**: ~$0.06 (OpenAI embeddings)
- **Weekly incremental sync (~100 KB)**: ~$0.002
- **Per query (100 chunks)**: ~$0.08 (embedding query + Claude Haiku response)
- **Monthly estimate**: $1-2 for regular use

Cost is dominated by Claude queries. Using `--top-k 10` reduces context size for simple queries.

## Documentation Files

- `README.md` - Setup and usage instructions
- `ARCHITECTURE.md` - System design with mermaid diagrams
- `EXAMPLES.md` - Query examples and workflows
- `QUICKSTART.md` - 5-minute setup guide

Refer to ARCHITECTURE.md for deep-dive explanations of design decisions (e.g., why hierarchical chunking, why Qdrant, why Haiku).
