# Task Completion Checklist

When a task is completed, perform these steps:

## 1. Type Checking
```bash
bun typecheck
```
Verify no TypeScript compilation errors.

## 2. Manual Testing
Test the affected functionality:
- For indexing changes: Run `bun sync full` or `bun sync incremental`
- For query changes: Run `bun query "test question" --show-context`
- For chunking/parsing changes: Verify output chunks preserve expected structure

## 3. IDE Verification
Check if IntelliJ or other IDE shows compilation errors.
- Note: IDE may be out of sync with actual state
- Don't spend excessive time fixing IDE sync issues
- Document if persistent discrepancy exists

## 4. Verification Queries (for query/indexing changes)
```bash
bun query "Who is Caelum Fenovar?" --show-context
```
Verify:
- Chunking preserves semantic meaning
- Embeddings capture query intent
- Metadata is correctly attached

## Note
- **No linting/formatting** commands configured in this project
- **No automated tests** currently exist
- Manual verification is the primary validation method
