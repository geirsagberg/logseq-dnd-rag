import { VectorRetriever } from './querying/retriever.js';
import { ClaudeQueryHandler } from './querying/query-handler.js';
import { config } from './config.js';

async function query() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎲 Logseq D&D RAG Query Tool

Usage:
  bun query "Your question here"
  bun query "Your question here" --show-context
  bun query "Your question here" --no-stream

Examples:
  bun query "What did we learn about the lich's phylactery?"
  bun query "Who is Caelum Fenovar?"
  bun query "What happened in our last session?"

Options:
  --show-context    Show the retrieved context chunks before the answer
  --no-stream       Disable streaming output (wait for full response)
  --top-k N         Number of context chunks to retrieve (default: ${config.query.topK})
  --help, -h        Show this help message
`);
    process.exit(0);
  }

  const showContext = args.includes('--show-context');
  const noStream = args.includes('--no-stream');
  const topKIndex = args.indexOf('--top-k');
  const topK = topKIndex !== -1 ? parseInt(args[topKIndex + 1] || String(config.query.topK)) : config.query.topK;

  const question = args
    .filter(
      (arg, index) =>
        !arg.startsWith('--') &&
        (topKIndex === -1 || index !== topKIndex + 1)
    )
    .join(' ');

  if (!question) {
    console.error('❌ Please provide a question');
    process.exit(1);
  }

  console.log(`\n🔍 Searching for: "${question}"\n`);

  const retriever = new VectorRetriever();
  const queryHandler = new ClaudeQueryHandler();

  const results = await retriever.search(question, topK);

  if (results.length === 0) {
    console.log('❌ No relevant context found in the knowledge base.');
    console.log('💡 Try syncing your Logseq notes first with: bun sync');
    process.exit(0);
  }

  console.log(`✅ Found ${results.length} relevant chunks\n`);

  if (showContext) {
    console.log('📚 Context:\n');
    results.forEach((result, index) => {
      const dateInfo = result.chunk.metadata.date
        ? new Date(result.chunk.metadata.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown';

      console.log(`[${index + 1}] ${result.chunk.metadata.title} (${dateInfo})`);
      console.log(`    Relevance: ${(result.score * 100).toFixed(1)}%`);
      console.log(`    ${result.chunk.content.slice(0, 150)}...\n`);
    });
    console.log('---\n');
  }

  console.log('🤖 Claude is thinking...\n');

  if (noStream) {
    const answer = await queryHandler.query(question, results);
    console.log(answer);
  } else {
    await queryHandler.streamQuery(question, results, (token) => {
      process.stdout.write(token);
    });
  }

  console.log('\n');
}

query().catch((error) => {
  console.error('❌ Query failed:', error);
  process.exit(1);
});
