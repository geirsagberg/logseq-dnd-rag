# Configuration and Environment

## Environment Variables
All configuration in `.env` file (see `.env.example` for template).

### Required
- `OPENAI_API_KEY` - For generating embeddings
- `ANTHROPIC_API_KEY` - For Claude responses
- `LOGSEQ_PATH` - Full path to Logseq directory (must contain `journals/` and `pages/`)

### Optional (with defaults)
- `QDRANT_URL=http://localhost:6333` - Change for cloud migration
- `QDRANT_COLLECTION_NAME=logseq-dnd-notes`
- `EMBEDDING_MODEL=text-embedding-3-small`
- `EMBEDDING_DIMENSIONS=1536`
- `CHUNK_SIZE=800` - Target tokens per chunk
- `CHUNK_OVERLAP=200` - Token overlap between chunks
- `TOP_K_RESULTS=100` - Default chunks retrieved per query
- `CLAUDE_MODEL=claude-haiku-4-5-20251001`

## Configuration Schema
Validated via Zod in `src/config.ts`. All config loaded from environment variables.

## Qdrant Migration (Local → Cloud)
To migrate from local Docker to Qdrant Cloud:
1. Sign up at cloud.qdrant.io
2. Update `.env`:
   ```
   QDRANT_URL=https://your-cluster.cloud.qdrant.io
   QDRANT_API_KEY=your-api-key
   ```
3. Run `bun sync full` to reindex to cloud

No code changes required - `QdrantClient` handles both local and cloud.

## Cost Estimates
- **Initial indexing (~12 MB notes)**: ~$0.06 (OpenAI embeddings)
- **Weekly incremental sync (~100 KB)**: ~$0.002
- **Per query (100 chunks)**: ~$0.08 (embedding + Claude Haiku)
- **Monthly estimate**: $1-2 for regular use

Cost dominated by Claude queries. Use `--top-k 10` for simple queries to reduce context.
