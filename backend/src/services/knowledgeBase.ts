/**
 * Phase 3: RAG Knowledge Base — PF2e rules retrieval via TF-IDF search.
 *
 * Indexes markdown files from content directories, chunks by entry boundary
 * (### / ## headers), builds a TF-IDF index for cosine-similarity retrieval.
 * Zero external dependencies. Pre-computes index on startup, caches to disk.
 *
 * Principle adherence: #7 (RAG Not Fine-Tuning), #2 (Token Efficiency)
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────

export type ChunkType =
  | 'feat'
  | 'class-feature'
  | 'archetype'
  | 'magic-item'
  | 'spell'
  | 'creature'
  | 'rule'
  | 'other';

export interface DocumentChunk {
  /** Stable identifier: `filename:byteOffset` */
  id: string;
  /** Source markdown filename */
  source: string;
  /** Entry title extracted from the markdown header */
  title: string;
  /** Full text content (header + body) */
  content: string;
  metadata: {
    type: ChunkType;
    level?: number;
    traits?: string[];
    className?: string;
  };
}

export interface QueryResult {
  chunk: DocumentChunk;
  /** Cosine similarity score (0–1) */
  score: number;
}

export interface QueryFilter {
  type?: ChunkType;
  className?: string;
  minLevel?: number;
  maxLevel?: number;
}

export interface KnowledgeBaseOptions {
  /** Directories to scan for .md files */
  contentDirs: string[];
  /** Path to the disk cache file */
  cachePath: string;
  /** Default number of results returned by query() (default: 5) */
  maxResults?: number;
}

// ─── Stop Words ─────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'am', 'it', 'its', 'of', 'in', 'to', 'for', 'with', 'on', 'at',
  'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'or', 'and', 'but', 'if', 'while',
  'about', 'up', 'down', 'that', 'this', 'these', 'those', 'which',
  'who', 'whom', 'what', 'also', 'your', 'you', 'they', 'them', 'their',
  'he', 'she', 'his', 'her', 'we', 'our', 'my', 'me',
]);

// PF2e class names used for filename inference
const PF2E_CLASSES = [
  'monk', 'fighter', 'rogue', 'ranger', 'wizard', 'witch', 'cleric',
  'champion', 'barbarian', 'bard', 'druid', 'sorcerer', 'oracle',
  'psychic', 'kineticist', 'magus', 'gunslinger', 'swashbuckler',
  'summoner', 'thaumaturge', 'investigator', 'inventor', 'commander',
  'guardian', 'exemplar', 'animist',
];

const CLASS_REGEX = new RegExp(`^(${PF2E_CLASSES.join('|')})`, 'i');

// ─── Knowledge Base ─────────────────────────────────────────

export class KnowledgeBase {
  private chunks: DocumentChunk[] = [];
  private docVectors: Map<string, number>[] = [];
  private idf: Map<string, number> = new Map();
  private initialized = false;

  private readonly maxResults: number;
  private readonly contentDirs: string[];
  private readonly cachePath: string;

  constructor(options: KnowledgeBaseOptions) {
    this.contentDirs = options.contentDirs;
    this.cachePath = options.cachePath;
    this.maxResults = options.maxResults ?? 5;
  }

  // ─── Public API ─────────────────────────────────────────

  /** Initialize the knowledge base: load cache or build fresh index. */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.loadCache()) {
      console.log(`📚 KnowledgeBase loaded from cache (${this.chunks.length} chunks)`);
      this.initialized = true;
      return;
    }

    console.log('📚 KnowledgeBase building index from markdown files...');
    this.chunks = this.loadDocuments();
    if (this.chunks.length === 0) {
      console.warn('📚 KnowledgeBase: no markdown content found in content directories');
      this.initialized = true;
      return;
    }

    this.buildIndex();
    this.saveCache();
    console.log(`📚 KnowledgeBase ready: ${this.chunks.length} chunks indexed`);
    this.initialized = true;
  }

  /** Query the knowledge base. Returns top-K results ranked by TF-IDF cosine similarity. */
  query(text: string, topK?: number): QueryResult[] {
    if (!this.initialized) throw new Error('KnowledgeBase not initialized — call initialize() first');
    const k = topK ?? this.maxResults;
    const queryVec = this.textToVector(text);
    if (queryVec.size === 0) return [];

    return this.rankDocuments(queryVec, k);
  }

  /** Query with metadata filters applied before ranking. */
  queryFiltered(text: string, filters: QueryFilter, topK?: number): QueryResult[] {
    if (!this.initialized) throw new Error('KnowledgeBase not initialized — call initialize() first');
    const k = topK ?? this.maxResults;
    const queryVec = this.textToVector(text);
    if (queryVec.size === 0) return [];

    return this.rankDocuments(queryVec, k, filters);
  }

  /** Total number of indexed chunks. */
  get size(): number {
    return this.chunks.length;
  }

  /** Force a full re-index (ignoring cache). */
  async rebuild(): Promise<void> {
    this.initialized = false;
    this.chunks = [];
    this.docVectors = [];
    this.idf = new Map();

    // Delete stale cache
    if (fs.existsSync(this.cachePath)) {
      fs.unlinkSync(this.cachePath);
    }

    await this.initialize();
  }

  // ─── Document Loading ───────────────────────────────────

  private loadDocuments(): DocumentChunk[] {
    const allChunks: DocumentChunk[] = [];

    for (const dir of this.contentDirs) {
      if (!fs.existsSync(dir)) {
        console.warn(`📚 Content directory not found, skipping: ${dir}`);
        continue;
      }

      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .sort();

      for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = this.chunkDocument(file, content);
        allChunks.push(...chunks);
      }
    }

    return allChunks;
  }

  // ─── Chunking ─────────────────────────────────────────────

  private chunkDocument(filename: string, content: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const fileType = this.inferFileType(filename);
    const className = this.inferClassName(filename);

    // Find all ## and ### headers
    const headerRegex = /^(#{2,3})\s+(.+)$/gm;
    const sections: { level: number; title: string; start: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(content)) !== null) {
      sections.push({
        level: match[1].length,
        title: match[2].trim(),
        start: match.index,
      });
    }

    if (sections.length === 0) {
      // No headers — treat entire file as one chunk
      const trimmed = content.trim();
      if (trimmed.length < 20) return chunks;

      chunks.push({
        id: `${filename}:0`,
        source: filename,
        title: filename.replace(/\.md$/, ''),
        content: trimmed,
        metadata: { type: fileType, className },
      });
      return chunks;
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const nextStart = i + 1 < sections.length ? sections[i + 1].start : content.length;
      const headerLineEnd = content.indexOf('\n', section.start);
      const bodyStart = headerLineEnd >= 0 ? headerLineEnd + 1 : section.start + section.title.length + section.level + 1;
      const body = content.slice(bodyStart, nextStart).trim();

      // Skip container-only headers (e.g., "## Level 1 (9 feats)") whose body
      // is entirely consumed by child ### sections
      if (body.length < 20 && i + 1 < sections.length && sections[i + 1].level > section.level) {
        continue;
      }

      // Skip empty or trivially short sections
      if (body.length < 10) continue;

      const fullText = `${section.title}\n${body}`;
      const metadata = this.extractMetadata(body, fileType, className);

      chunks.push({
        id: `${filename}:${section.start}`,
        source: filename,
        title: section.title,
        content: fullText,
        metadata,
      });
    }

    return chunks;
  }

  private inferFileType(filename: string): ChunkType {
    const lower = filename.toLowerCase();
    if (lower.includes('class-feature') || lower.includes('class_feature')) return 'class-feature';
    if (lower.includes('archetype')) return 'archetype';
    if (lower.includes('magic-item') || lower.includes('magic_item')) return 'magic-item';
    if (lower.includes('spell')) return 'spell';
    if (lower.includes('bestiary') || lower.includes('creature')) return 'creature';
    if (lower.includes('feat')) return 'feat';
    return 'other';
  }

  private inferClassName(filename: string): string | undefined {
    const match = filename.match(CLASS_REGEX);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractMetadata(body: string, fileType: ChunkType, className?: string): DocumentChunk['metadata'] {
    const metadata: DocumentChunk['metadata'] = { type: fileType, className };

    // Extract level: "**ID:** 5976 | **Level:** 1" or "**Level:** 4" or "Feat 8"
    const levelMatch =
      body.match(/\*\*Level\*?\*?[:\s]*(\d+)/i) ||
      body.match(/\|\s*\*\*Level\*?\*?[:\s]*(\d+)/i) ||
      body.match(/\bFeat\s+(\d+)/i) ||
      body.match(/\bLevel\s+(\d+)/);
    if (levelMatch) metadata.level = parseInt(levelMatch[1], 10);

    // Extract traits: "**Traits:** Monk, Stance, Flourish"
    const traitsMatch = body.match(/\*\*Traits\*?\*?[:\s]*([^\n]+)/i);
    if (traitsMatch) {
      metadata.traits = traitsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/\*+/g, ''))
        .filter(t => t.length > 0);
    }

    return metadata;
  }

  // ─── TF-IDF Index ─────────────────────────────────────────

  private buildIndex(): void {
    const N = this.chunks.length;
    if (N === 0) return;

    // Tokenize all documents and compute document frequency
    const df = new Map<string, number>();
    const allTokens: string[][] = [];

    for (const chunk of this.chunks) {
      const tokens = this.tokenize(chunk.content);
      allTokens.push(tokens);

      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    // Compute IDF: log(N / df)
    this.idf = new Map();
    for (const [term, count] of df) {
      this.idf.set(term, Math.log(N / count));
    }

    // Compute TF-IDF vector for each document
    this.docVectors = [];
    for (const tokens of allTokens) {
      const tf = new Map<string, number>();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
      }

      const vec = new Map<string, number>();
      const len = tokens.length;
      for (const [term, count] of tf) {
        const tfidf = (count / len) * (this.idf.get(term) ?? 0);
        if (tfidf > 0) vec.set(term, tfidf);
      }
      this.docVectors.push(vec);
    }
  }

  // ─── Query Helpers ────────────────────────────────────────

  private textToVector(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return new Map();

    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const vec = new Map<string, number>();
    for (const [term, count] of tf) {
      const idfVal = this.idf.get(term) ?? 0;
      const tfidf = (count / tokens.length) * idfVal;
      if (tfidf > 0) vec.set(term, tfidf);
    }
    return vec;
  }

  private rankDocuments(queryVec: Map<string, number>, topK: number, filters?: QueryFilter): QueryResult[] {
    const results: QueryResult[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      // Apply metadata filters before scoring
      if (filters) {
        const m = this.chunks[i].metadata;
        if (filters.type && m.type !== filters.type) continue;
        if (filters.className && m.className !== filters.className) continue;
        if (filters.minLevel != null && (m.level == null || m.level < filters.minLevel)) continue;
        if (filters.maxLevel != null && (m.level == null || m.level > filters.maxLevel)) continue;
      }

      const score = this.cosineSimilarity(queryVec, this.docVectors[i]);
      if (score > 0) {
        results.push({ chunk: this.chunks[i], score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // ─── Similarity ───────────────────────────────────────────

  private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;

    // Iterate over the smaller map for efficiency
    const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
    for (const [term, val] of smaller) {
      const other = larger.get(term);
      if (other !== undefined) dot += val * other;
    }

    if (dot === 0) return 0;

    let normA = 0;
    for (const val of a.values()) normA += val * val;

    let normB = 0;
    for (const val of b.values()) normB += val * val;

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ─── Tokenization ────────────────────────────────────────

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[*#|_`\[\](){}]/g, ' ')    // strip markdown formatting
      .replace(/[^\w\s'-]/g, ' ')            // keep words, hyphens, apostrophes
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  // ─── Disk Cache ───────────────────────────────────────────

  private saveCache(): void {
    try {
      const cacheDir = path.dirname(this.cachePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const fingerprint = this.getSourceFingerprint();

      const cacheData = {
        version: 1,
        sourceFingerprint: fingerprint,
        chunks: this.chunks,
        idf: Array.from(this.idf.entries()),
        docVectors: this.docVectors.map(v => Array.from(v.entries())),
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(cacheData));
      console.log(`📚 KnowledgeBase cache saved to ${this.cachePath}`);
    } catch (err) {
      console.warn('📚 Failed to save KnowledgeBase cache:', err);
    }
  }

  private loadCache(): boolean {
    try {
      if (!fs.existsSync(this.cachePath)) return false;

      const raw = fs.readFileSync(this.cachePath, 'utf-8');
      const data = JSON.parse(raw);

      if (data.version !== 1) return false;

      // Validate source freshness
      const currentFingerprint = this.getSourceFingerprint();
      if (data.sourceFingerprint !== currentFingerprint) {
        console.log('📚 Source files changed since last cache, rebuilding...');
        return false;
      }

      this.chunks = data.chunks;
      this.idf = new Map(data.idf as [string, number][]);
      this.docVectors = (data.docVectors as [string, number][][]).map(
        (entries) => new Map(entries)
      );

      return true;
    } catch {
      return false;
    }
  }

  /** Fingerprint = sorted filenames + sizes + mtimes, so any change triggers rebuild. */
  private getSourceFingerprint(): string {
    const parts: string[] = [];

    for (const dir of this.contentDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .sort();

      for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        parts.push(`${file}:${stat.size}:${stat.mtimeMs}`);
      }
    }

    return parts.join('|');
  }
}
