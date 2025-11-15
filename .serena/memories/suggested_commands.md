# Suggested Commands

## Development
```bash
bun install             # Install dependencies
bun typecheck           # Type check without building (use this during development)
bun run build           # Compile TypeScript to dist/
```

## Running the System
```bash
# Start Qdrant vector database (required before sync/query)
docker compose up -d

# Index Logseq notes
bun sync full           # Full reindex of all notes
bun sync incremental    # Only index files modified in last 24 hours

# Query the system
bun query "question"                    # Ask a question
bun query "question" --show-context     # Show retrieved chunks with scores
bun query "question" --top-k 50         # Retrieve 50 chunks (default: 100)
bun query "question" --no-stream        # Non-streaming response
```

## Qdrant Database Management
```bash
docker compose up -d                                        # Start Qdrant
docker compose down                                         # Stop Qdrant
curl http://localhost:6333/collections/logseq-dnd-notes    # Check collection status
```

## Testing & Verification
After making changes, test with:
```bash
bun query "Who is Caelum Fenovar?" --show-context
```
The `--show-context` flag shows retrieved chunks with relevance scores.

## System Commands (Darwin/macOS)
Standard Unix commands: `git`, `ls`, `cd`, `grep`, `find`, `cat`, etc.
