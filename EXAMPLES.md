# Example Usage

## Setup

```bash
./setup.sh
```

## Indexing

### Full Sync (First Time)

```bash
bun sync full
```

**Output:**
```
🚀 Starting Logseq sync...

📚 Full sync mode: indexing all pages...

Found 147 pages

  January 18, 2021: 3 chunks
  April 25, 2021: 5 chunks
  Caelum Fenovar: 2 chunks
  Bregan d'Aerthe: 4 chunks
  ...

📝 Total chunks: 342

Indexing 342 chunks...
Indexed 100/342 chunks
Indexed 200/342 chunks
Indexed 342/342 chunks
Indexing complete!

Collection Info: {
  name: 'logseq-dnd-notes',
  pointsCount: 342,
  vectorsCount: 342
}

✅ Sync complete!
```

### Incremental Sync

```bash
bun sync incremental
```

**Output:**
```
🔄 Incremental sync mode: checking for changes...

Found 2 modified files:
  - /path/to/journals/2024_12_27.md
  - /path/to/pages/Elara.md

Parsed 2 pages

  December 27, 2024: 8 chunks
  Elara: 2 chunks

📝 Total chunks: 10

Indexing 10 chunks...
Indexed 10/10 chunks
Indexing complete!

✅ Sync complete!
```

## Querying

### Basic Query

```bash
bun query "Who is Caelum Fenovar?"
```

**Output:**
```
🔍 Searching for: "Who is Caelum Fenovar?"

✅ Found 5 relevant chunks

🤖 Claude is thinking...

Caelum Fenovar is a disillusioned veteran character in your campaign. Based on the notes:

**Background:**
- He has worshipped many gods over time, including Tempus, Tyr, and Lathander
- His family was murdered in the dark, which left him deathly afraid of darkness
- Despite his devotion to various gods, he feels they never helped him

**Current Status:**
- Member of the Seekers of the Sun
- The Seekers gave him Darkvision, which helped him overcome his fear of the dark
- He truly believes in the organization's mission to provide safe return to the surface
- He has proven himself within the Seekers

**Concerns:**
- He's noticed worrying signals within the Seekers, including racism and a vision for a future with only surface races
- This suggests some internal conflict about the organization he serves
```

### Query with Context Display

```bash
bun query "What happened with Bregan d'Aerthe?" --show-context
```

**Output:**
```
🔍 Searching for: "What happened with Bregan d'Aerthe?"

✅ Found 5 relevant chunks

📚 Context:

[1] December 27, 2024 (December 27, 2024)
    Relevance: 94.3%
    - [[Bregan d'Aerthe]]
	- Connected to the [[Runners]]
	- Izzold knows one of them
	- Members traveling to Deepwater:...

[2] Bregan d'Aerthe (Unknown)
    Relevance: 89.1%
    - Elite drow mercenary organization
	- Known for stealth missions
	- Have presence in both Underdark and surface cities...

---

🤖 Claude is thinking...

Based on your campaign notes, here's what happened with Bregan d'Aerthe:

**Recent Events (December 27, 2024):**
...
```

### Advanced Query with Options

```bash
bun query "Tell me about the NPCs" --top-k 10 --show-context
```

## Example Queries

### Character Information

```bash
bun query "Who is Elara and what is her role?"
bun query "What do we know about the lich?"
bun query "List all the NPCs we've met in Deepwater"
```

### Location Queries

```bash
bun query "Describe Deepwater location"
bun query "Where have we visited in the Underdark?"
bun query "What shops are in the Gloam Market?"
```

### Plot and Timeline

```bash
bun query "What happened in our last session?"
bun query "What do we know about the phylactery quest?"
bun query "How did we first meet Bregan d'Aerthe?"
```

### Items and Mechanics

```bash
bun query "What magic items have we found?"
bun query "What potions did we buy?"
bun query "What are the orbs in Discard's head?"
```

## Programmatic Usage

### TypeScript

```typescript
import {
  VectorRetriever,
  ClaudeQueryHandler,
  LogseqParser,
  LogseqChunker,
  VectorIndexer,
} from './src/index.js';

// Query existing knowledge base
async function askQuestion(question: string) {
  const retriever = new VectorRetriever();
  const handler = new ClaudeQueryHandler();

  const results = await retriever.search(question, 5);
  const answer = await handler.query(question, results);

  console.log(answer);
}

// Index new content
async function indexNewNote(filePath: string) {
  const parser = new LogseqParser('/path/to/logseq');
  const chunker = new LogseqChunker();
  const indexer = new VectorIndexer();

  const pages = await parser.parseChangedFiles([filePath]);
  const chunks = pages.flatMap(page => chunker.chunkPage(page));

  await indexer.indexChunks(chunks);
}

// Date-filtered search
async function searchByDateRange(
  query: string,
  from: Date,
  to: Date
) {
  const retriever = new VectorRetriever();

  const results = await retriever.searchByDate(query, from, to, 5);
  console.log(results);
}

// Usage
await askQuestion("Who is Caelum Fenovar?");
await searchByDateRange(
  "What happened?",
  new Date('2024-12-01'),
  new Date('2024-12-31')
);
```

## Workflow Recommendations

### After Each Game Session

1. Take notes in Logseq as usual
2. Run incremental sync:
   ```bash
   bun sync incremental
   ```

### Before Game Session (Prep)

Query your notes to refresh your memory:

```bash
bun query "What happened last session?"
bun query "What are the active plot threads?"
bun query "Who are the recurring NPCs?"
```

### Monthly Maintenance

Run a full sync to ensure everything is indexed:

```bash
bun sync full
```

## Tips

1. **Be specific in queries:** Instead of "Tell me about Elara", try "What is Elara's relationship with Bregan d'Aerthe?"

2. **Use --show-context** to verify the AI is pulling from the right sources

3. **Adjust --top-k** based on query:
   - Simple lookups: `--top-k 3`
   - Complex questions: `--top-k 10`

4. **Date-based searches** are coming soon for timeline queries

5. **Page links in Logseq** (`[[Name]]`) help the system understand relationships
