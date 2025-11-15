import Anthropic from '@anthropic-ai/sdk';
import type { SearchResult } from '../types.js';
import { config } from '../config.js';

export class ClaudeQueryHandler {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async query(question: string, context: SearchResult[]): Promise<string> {
    const contextText = this.formatContext(context);

    const systemPrompt = `You are a helpful assistant for a Dungeon Master running a D&D campaign called "Postfall".

You have access to campaign notes from Logseq that include session journals, NPC descriptions, locations, and plot threads.

Your role is to:
1. Answer questions about the campaign using the provided context
2. Cite specific dates or sources when referencing information
3. Acknowledge when you don't have enough information
4. Help the DM recall details, connections, and continuity

The campaign notes use Logseq syntax:
- [[Page Name]] indicates links to other pages (NPCs, locations, etc.)
- Bullet points with indentation show hierarchical notes
- Journal entries are dated

Be conversational but precise. Help the DM run a great game!`;

    const userPrompt = `Based on the following campaign notes, please answer this question:

${question}

### Campaign Notes:

${contextText}

Please provide a comprehensive answer based on the notes above. If the notes don't contain enough information, say so.`;

    const response = await this.anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return 'No response generated';
  }

  async streamQuery(
    question: string,
    context: SearchResult[],
    onToken: (token: string) => void
  ): Promise<void> {
    const contextText = this.formatContext(context);

    const systemPrompt = `You are a helpful assistant for a Dungeon Master running a D&D campaign called "Postfall".

You have access to campaign notes from Logseq that include session journals, NPC descriptions, locations, and plot threads.

Your role is to:
1. Answer questions about the campaign using the provided context
2. Cite specific dates or sources when referencing information
3. Acknowledge when you don't have enough information
4. Help the DM recall details, connections, and continuity

The campaign notes use Logseq syntax:
- [[Page Name]] indicates links to other pages (NPCs, locations, etc.)
- Bullet points with indentation show hierarchical notes
- Journal entries are dated

Be conversational but precise. Help the DM run a great game!`;

    const userPrompt = `Based on the following campaign notes, please answer this question:

${question}

### Campaign Notes:

${contextText}

Please provide a comprehensive answer based on the notes above. If the notes don't contain enough information, say so.`;

    const stream = await this.anthropic.messages.stream({
      model: config.anthropic.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        onToken(chunk.delta.text);
      }
    }
  }

  private formatContext(context: SearchResult[]): string {
    return context
      .map((result, index) => {
        const { chunk, score } = result;
        const dateInfo = chunk.metadata.date
          ? new Date(chunk.metadata.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'Unknown date';

        const sourceInfo =
          chunk.metadata.type === 'journal'
            ? `Journal Entry: ${dateInfo}`
            : `Page: ${chunk.metadata.title}`;

        return `[${index + 1}] ${sourceInfo} (Relevance: ${(score * 100).toFixed(1)}%)
${chunk.content}`;
      })
      .join('\n\n---\n\n');
  }
}
