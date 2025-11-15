import { readFileSync } from 'fs';
import { join } from 'path';

export const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  LOGSEQ_PATH: '/mock/logseq/path',
  QDRANT_URL: 'http://localhost:6333',
  QDRANT_COLLECTION_NAME: 'test-collection',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIMENSIONS: '1536',
  CHUNK_SIZE: '800',
  CHUNK_OVERLAP: '200',
  TOP_K_RESULTS: '100',
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
};

export function loadFixture(filename: string): string {
  return readFileSync(join(__dirname, 'fixtures', filename), 'utf-8');
}

export const mockJournalContent = `- Session 42 at the Ruins of Eldrath
  - The party investigated the ancient ruins
    - Found mysterious artifacts
    - [[Caelum Fenovar]] revealed his connection to the archmage
  - Combat encounter with shadow creatures
    - ((abc123-def456))
  - Discovered clues about the [[Phylactery]]
- Character development
  - [[Theron]] gained a new spell
  - The group decided to head north`;

export const mockPageContent = `---
title: Caelum Fenovar
tags: npc, wizard, important
---

- Mysterious wizard from the northern territories
  - Seeks the legendary [[Phylactery of Souls]]
  - Former apprentice of Archmage Velrath
    - Studied under him for 20 years
    - Parted ways after a disagreement about necromancy
- Appearance
  - Tall figure in blue robes
  - Staff adorned with crystalline shards`;
