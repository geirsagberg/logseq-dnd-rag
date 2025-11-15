import { v4 as uuidv4 } from 'uuid';
import type { LogseqPage, DocumentChunk } from '../types.js';

interface BulletPoint {
  level: number;
  content: string;
  children: BulletPoint[];
  line: number;
}

export class LogseqChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(chunkSize: number = 800, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  chunkPage(page: LogseqPage): DocumentChunk[] {
    const bulletTree = this.parseBulletTree(page.content);
    const chunks: DocumentChunk[] = [];

    if (bulletTree.length === 0) {
      if (page.content.trim().length > 0) {
        chunks.push(this.createChunk(page, page.content, 0, 1));
      }
      return chunks;
    }

    const sections = this.groupIntoSections(bulletTree);
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionText = this.bulletTreeToText(section);

      if (this.estimateTokens(sectionText) <= this.chunkSize) {
        chunks.push(this.createChunk(page, sectionText, chunkIndex++, sections.length));
      } else {
        const subChunks = this.splitLargeSection(section);
        for (const subChunk of subChunks) {
          chunks.push(this.createChunk(page, subChunk, chunkIndex++, sections.length + subChunks.length - 1));
        }
      }
    }

    return chunks.length > 0 ? chunks : [this.createChunk(page, page.content, 0, 1)];
  }

  private parseBulletTree(content: string): BulletPoint[] {
    const lines = content.split('\n');
    const root: BulletPoint[] = [];
    const stack: { level: number; node: BulletPoint[] }[] = [{ level: -1, node: root }];

    lines.forEach((line, lineNum) => {
      const match = line.match(/^(\t*)-\s(.+)$/);
      if (!match) return;

      const level = match[1]!.length;
      const content = match[2]!;

      const bulletPoint: BulletPoint = {
        level,
        content,
        children: [],
        line: lineNum,
      };

      while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      if (parent) {
        parent.node.push(bulletPoint);
        stack.push({ level, node: bulletPoint.children });
      }
    });

    return root;
  }

  private groupIntoSections(bullets: BulletPoint[]): BulletPoint[][] {
    const sections: BulletPoint[][] = [];
    let currentSection: BulletPoint[] = [];
    let currentSize = 0;

    for (const bullet of bullets) {
      const bulletText = this.bulletTreeToText([bullet]);
      const bulletSize = this.estimateTokens(bulletText);

      if (currentSize + bulletSize > this.chunkSize && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [bullet];
        currentSize = bulletSize;
      } else {
        currentSection.push(bullet);
        currentSize += bulletSize;
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  private splitLargeSection(bullets: BulletPoint[]): string[] {
    const chunks: string[] = [];

    for (const bullet of bullets) {
      if (bullet.children.length > 0) {
        const childChunks = this.splitLargeSection(bullet.children);
        for (const childChunk of childChunks) {
          const withParent = `${bullet.content}\n${childChunk}`;
          chunks.push(withParent);
        }
      } else {
        chunks.push(bullet.content);
      }
    }

    return chunks;
  }

  private bulletTreeToText(bullets: BulletPoint[]): string {
    const lines: string[] = [];

    const traverse = (bullet: BulletPoint, indent: number = 0) => {
      lines.push('\t'.repeat(indent) + '- ' + bullet.content);
      bullet.children.forEach((child) => traverse(child, indent + 1));
    };

    bullets.forEach((bullet) => traverse(bullet));
    return lines.join('\n');
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private createChunk(
    page: LogseqPage,
    content: string,
    chunkIndex: number,
    totalChunks: number
  ): DocumentChunk {
    return {
      id: uuidv4(),
      content,
      metadata: {
        source: page.path,
        type: page.type,
        title: page.metadata.title,
        date: page.date?.toISOString(),
        pageLinks: page.metadata.pageLinks,
        chunkIndex,
        totalChunks,
      },
    };
  }
}
