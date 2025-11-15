# Quick Start Guide

Get your Logseq D&D RAG system running in 5 minutes!

## 1. Setup Environment

```bash
./setup.sh
```

Or manually:

```bash
cp .env.example .env
```

Edit `.env` and add:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LOGSEQ_PATH=/Users/geirsagberg/Library/CloudStorage/Dropbox-Personal/Logseq/Postfall
```

## 2. Start Qdrant

```bash
docker compose up -d
```

Verify it's running: http://localhost:6333/dashboard

## 3. Index Your Notes

```bash
bun sync full
```

This will take 5-10 minutes for ~12 MB of notes. Go grab a coffee!

## 4. Ask Questions

```bash
bun query "Who is Caelum Fenovar?"
bun query "What happened in our last session?"
bun query "Tell me about Bregan d'Aerthe"
```

## That's It!

**Regular Usage:**

```bash
# After each game session
bun sync incremental

# During game prep
bun query "What are the active plot threads?"
```

## Troubleshooting

**"Collection not found"**
```bash
docker compose up -d
bun sync full
```

**"No relevant context found"**
```bash
bun sync full
```

**Check types:**
```bash
bun typecheck
```

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [EXAMPLES.md](./EXAMPLES.md) for more query examples
- See [Architecture](#architecture) section in README

## Cost Estimate

- Initial indexing (~12 MB): **~$0.06**
- Weekly syncs: **~$0.002**
- 100 queries/month: **~$1.00**

**Total: $1-2/month**
