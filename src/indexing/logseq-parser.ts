import { readFile, readdir, stat } from 'fs/promises';
import { join, basename, extname } from 'path';
import matter from 'gray-matter';
import type { LogseqPage } from '../types.js';

export class LogseqParser {
  private readonly logseqPath: string;

  constructor(logseqPath: string) {
    this.logseqPath = logseqPath;
  }

  async parseAllPages(): Promise<LogseqPage[]> {
    const pages: LogseqPage[] = [];

    const journalsPath = join(this.logseqPath, 'journals');
    const pagesPath = join(this.logseqPath, 'pages');

    const [journals, regularPages] = await Promise.all([
      this.parseDirectory(journalsPath, 'journal'),
      this.parseDirectory(pagesPath, 'page'),
    ]);

    pages.push(...journals, ...regularPages);
    return pages;
  }

  async parseChangedFiles(filePaths: string[]): Promise<LogseqPage[]> {
    const pages = await Promise.all(
      filePaths.map(async (path) => {
        const type = path.includes('/journals/') ? 'journal' : 'page';
        return this.parsePage(path, type);
      })
    );
    return pages.filter((page): page is LogseqPage => page !== null);
  }

  private async parseDirectory(
    dirPath: string,
    type: 'journal' | 'page'
  ): Promise<LogseqPage[]> {
    try {
      const files = await readdir(dirPath);
      const markdownFiles = files.filter((file) => extname(file) === '.md');

      const pages = await Promise.all(
        markdownFiles.map(async (file) => {
          const filePath = join(dirPath, file);
          return this.parsePage(filePath, type);
        })
      );

      return pages.filter((page): page is LogseqPage => page !== null);
    } catch (error) {
      console.warn(`Could not read directory ${dirPath}:`, error);
      return [];
    }
  }

  private async parsePage(
    filePath: string,
    type: 'journal' | 'page'
  ): Promise<LogseqPage | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const filename = basename(filePath, '.md');

      const { data: frontmatter, content: mainContent } = matter(content);

      const pageLinks = this.extractPageLinks(mainContent);
      const blockRefs = this.extractBlockRefs(mainContent);

      let date: Date | undefined;
      let title: string;

      if (type === 'journal') {
        date = this.parseJournalDate(filename);
        title = date ? this.formatJournalTitle(date) : filename;
      } else {
        title = frontmatter.title || filename;
      }

      return {
        path: filePath,
        filename,
        type,
        date,
        content: mainContent,
        metadata: {
          title,
          pageLinks,
          blockRefs,
        },
      };
    } catch (error) {
      console.warn(`Could not parse file ${filePath}:`, error);
      return null;
    }
  }

  private parseJournalDate(filename: string): Date | undefined {
    const match = filename.match(/^(\d{4})_(\d{2})_(\d{2})$/);
    if (!match || !match[1] || !match[2] || !match[3]) return undefined;

    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  private formatJournalTitle(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private extractPageLinks(content: string): string[] {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]!);
    }

    return [...new Set(links)];
  }

  private extractBlockRefs(content: string): string[] {
    const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;
    const refs: string[] = [];
    let match;

    while ((match = blockRefRegex.exec(content)) !== null) {
      refs.push(match[1]!);
    }

    return [...new Set(refs)];
  }

  async getModifiedFiles(since: Date): Promise<string[]> {
    const allFiles: string[] = [];
    const directories = [
      join(this.logseqPath, 'journals'),
      join(this.logseqPath, 'pages'),
    ];

    for (const dir of directories) {
      try {
        const files = await readdir(dir);
        for (const file of files) {
          if (extname(file) !== '.md') continue;

          const filePath = join(dir, file);
          const stats = await stat(filePath);

          if (stats.mtime > since) {
            allFiles.push(filePath);
          }
        }
      } catch (error) {
        console.warn(`Could not read directory ${dir}:`, error);
      }
    }

    return allFiles;
  }
}
