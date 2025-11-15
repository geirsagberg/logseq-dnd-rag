# Logseq D&D RAG System

A Retrieval-Augmented Generation (RAG) system for querying D&D campaign notes stored in Logseq using semantic search and Claude AI.

## Overview

This system:
- Parses Logseq markdown files (journals and pages)
- Chunks content intelligently while preserving context
- Generates embeddings using OpenAI
- Stores vectors in Qdrant for semantic search
- Answers questions using Claude with relevant context

## Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Docker](https://www.docker.com/) (for Qdrant)
- OpenAI API key (for embeddings)
- Anthropic API key (for Claude)

## Setup

### 1. Clone and Install

```bash
cd logseq-dnd-rag
bun install
```

### 2. Start Qdrant

```bash
docker compose up -d
```

This starts Qdrant on `localhost:6333`. Data persists in `./.qdrant/`.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LOGSEQ_PATH=/Users/geirsagberg/Library/CloudStorage/Dropbox-Personal/Logseq/Postfall
```

### 4. Initial Sync

Index all your Logseq notes:

```bash
bun sync full
```

This will:
- Parse all journals and pages
- Chunk content (~800 tokens per chunk)
- Generate embeddings
- Store in Qdrant

**Note:** For ~12 MB of notes, this takes 5-10 minutes and costs ~$0.50 in OpenAI API calls.

## Usage

### Querying

Ask questions about your campaign:

```bash
bun query "What did we learn about the lich's phylactery?"
```

**Examples:**

```bash
bun query "Who is Caelum Fenovar?"
bun query "What happened with Bregan d'Aerthe?"
bun query "Describe the Deepwater location"
bun query "What happened in our last session?"
```

**Options:**

```bash
--show-context    # Show retrieved chunks before answer
--no-stream       # Wait for full response (no streaming)
--top-k N         # Retrieve N chunks (default: 5)
```

**Example with options:**

```bash
bun query "Who are the main NPCs?" --show-context --top-k 10
```

### Syncing

#### Full Sync

Reindex everything:

```bash
bun sync full
```

#### Incremental Sync

Update only files modified in the last 24 hours:

```bash
bun sync incremental
```

**Recommended workflow:**
- Run `bun sync full` once initially
- Run `bun sync incremental` after each game session
- Run `bun sync full` monthly or when restructuring notes

## Architecture

### Components

1. **Logseq Parser** (`src/indexing/logseq-parser.ts`)
   - Parses journals (YYYY_MM_DD.md) and pages
   - Extracts metadata: dates, page links `[[Name]]`, block refs `((uuid))`

2. **Chunker** (`src/indexing/chunker.ts`)
   - Preserves hierarchical bullet structure
   - Respects heading boundaries
   - ~800 token chunks with 200 token overlap

3. **Indexer** (`src/indexing/indexer.ts`)
   - Generates embeddings (OpenAI text-embedding-3-small)
   - Stores in Qdrant with metadata

4. **Retriever** (`src/querying/retriever.ts`)
   - Semantic search via cosine similarity
   - Returns top-K most relevant chunks

5. **Query Handler** (`src/querying/query-handler.ts`)
   - Formats context for Claude
   - Streams responses
   - Cites sources with dates

### Data Flow

```
Logseq Files → Parser → Chunker → Embeddings → Qdrant
                                                    ↓
Query → Embedding → Semantic Search → Context → Claude → Answer
```

## Logseq Structure

The system handles:

- **Journals:** Date-based session notes (`journals/2024_12_27.md`)
- **Pages:** NPCs, locations, concepts (`pages/Caelum Fenovar.md`)

**Supported Logseq syntax:**
- Page links: `[[Page Name]]`
- Block references: `((uuid))`
- Hierarchical bullets with tabs
- Properties (front matter)

## Cost Estimation

### OpenAI (Embeddings)

- Model: `text-embedding-3-small`
- Price: $0.02 per 1M tokens
- Initial 12 MB: ~3M tokens = **$0.06**
- Weekly updates: ~25K tokens = **$0.0005/week**

### Anthropic (Queries)

- Model: `claude-3-5-sonnet-20241022`
- Price: $3 input / $15 output per 1M tokens
- Average query: ~2K input + 500 output = **$0.01/query**

### Total Monthly Cost

- Initial sync: **$0.06** (one-time)
- Weekly syncs: **$0.002/month**
- 100 queries/month: **$1.00**

**Estimated: $1-2/month after initial setup**

## Qdrant Migration

To migrate from local to cloud:

1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
2. Create a cluster and get API key
3. Update `.env`:
   ```env
   QDRANT_URL=https://your-cluster.cloud.qdrant.io
   QDRANT_API_KEY=your-api-key
   ```
4. Run `bun sync full` to reindex to cloud

**No code changes required!**

## Troubleshooting

### "Collection not found"

```bash
docker compose up -d
bun sync full
```

### "No relevant context found"

Your knowledge base might be empty:

```bash
bun sync full
```

### Slow queries

Reduce context chunks:

```bash
bun query "question" --top-k 3
```

### TypeScript errors

```bash
bun typecheck
```

## Development

### Type checking

```bash
bun typecheck
```

### Build

```bash
bun run build
```

### Project Structure

```
logseq-dnd-rag/
├── src/
│   ├── indexing/
│   │   ├── logseq-parser.ts   # Parse Logseq files
│   │   ├── chunker.ts          # Intelligent chunking
│   │   └── indexer.ts          # Vector indexing
│   ├── querying/
│   │   ├── retriever.ts        # Semantic search
│   │   └── query-handler.ts    # Claude integration
│   ├── config.ts               # Configuration loader
│   ├── types.ts                # TypeScript types
│   ├── sync.ts                 # Sync CLI
│   └── query.ts                # Query CLI
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env
```

## Advanced Usage

### Programmatic API

```typescript
import { VectorRetriever } from './src/querying/retriever.js';
import { ClaudeQueryHandler } from './src/querying/query-handler.js';

const retriever = new VectorRetriever();
const handler = new ClaudeQueryHandler();

const results = await retriever.search("Who is Elara?", 5);
const answer = await handler.query("Who is Elara?", results);
console.log(answer);
```

### Date-filtered Queries

```typescript
const results = await retriever.searchByDate(
  "What happened?",
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  5
);
```

## Future Enhancements

- [ ] MCP server for Claude Desktop integration
- [ ] Web UI for queries
- [ ] Automatic Dropbox webhook syncing
- [ ] Graph visualization of page connections
- [ ] Export query history

## License

MIT
