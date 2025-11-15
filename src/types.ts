export interface LogseqPage {
  path: string;
  filename: string;
  type: 'journal' | 'page';
  date?: Date;
  content: string;
  metadata: {
    title: string;
    pageLinks: string[];
    blockRefs: string[];
  };
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'journal' | 'page';
    title: string;
    date?: string;
    pageLinks: string[];
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}
