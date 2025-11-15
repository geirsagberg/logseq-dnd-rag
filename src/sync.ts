import { LogseqParser } from './indexing/logseq-parser.js';
import { LogseqChunker } from './indexing/chunker.js';
import { VectorIndexer } from './indexing/indexer.js';
import { config } from './config.js';

async function syncLogseq() {
  console.log('🚀 Starting Logseq sync...\n');

  const parser = new LogseqParser(config.logseq.path);
  const chunker = new LogseqChunker(
    config.chunking.chunkSize,
    config.chunking.chunkOverlap
  );
  const indexer = new VectorIndexer();

  await indexer.initializeCollection();

  const mode = process.argv[2] || 'full';

  if (mode === 'full') {
    console.log('📚 Full sync mode: indexing all pages...\n');
    const pages = await parser.parseAllPages();
    console.log(`Found ${pages.length} pages\n`);

    const allChunks = pages.flatMap((page) => {
      const chunks = chunker.chunkPage(page);
      console.log(`  ${page.metadata.title}: ${chunks.length} chunks`);
      return chunks;
    });

    console.log(`\n📝 Total chunks: ${allChunks.length}\n`);
    await indexer.indexChunks(allChunks);
  } else if (mode === 'incremental') {
    console.log('🔄 Incremental sync mode: checking for changes...\n');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const modifiedFiles = await parser.getModifiedFiles(oneDayAgo);

    if (modifiedFiles.length === 0) {
      console.log('No modified files found in the last 24 hours');
      return;
    }

    console.log(`Found ${modifiedFiles.length} modified files:\n`);
    modifiedFiles.forEach((file) => console.log(`  - ${file}`));

    const pages = await parser.parseChangedFiles(modifiedFiles);
    console.log(`\nParsed ${pages.length} pages\n`);

    for (const page of pages) {
      await indexer.deleteChunksFromSource(page.path);
    }

    const allChunks = pages.flatMap((page) => {
      const chunks = chunker.chunkPage(page);
      console.log(`  ${page.metadata.title}: ${chunks.length} chunks`);
      return chunks;
    });

    console.log(`\n📝 Total chunks: ${allChunks.length}\n`);
    await indexer.indexChunks(allChunks);
  } else {
    console.error('Invalid mode. Use "full" or "incremental"');
    process.exit(1);
  }

  await indexer.getCollectionInfo();
  console.log('\n✅ Sync complete!');
}

syncLogseq().catch((error) => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
