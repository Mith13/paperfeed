export interface AuthorInfo {
  name: string;
  orcid?: string;
  affiliation?: string;
}

export interface PaperData {
  id: string;
  title: string;
  authors: string | AuthorInfo[];
  abstract: string | string[];
  source: 'arXiv' | 'bioRxiv' | 'chemRxiv' | string;
  sourceId?: string;
  category?: string;
  date?: string | Date;
  abstractBadge?: string;
  tags?: string[];
  citations?: number;
  likes?: number;
  saves?: number;
  altmetricScore?: number;
  methodology?: {
    doi: string;
    badges: string[];
  };
  bibtex?: string;
  embedding?: number[];
}

export default class Paper {
  id: string;
  title: string;
  authors: string;
  authorList: AuthorInfo[];
  abstract: string;
  abstractParagraphs: string[];
  source: string;
  sourceId: string;
  category: string;
  abstractBadge?: string;
  rawDate: Date | 'None';
  date: string;
  tags: string[];
  citations: number;
  likes: number;
  saves: number;
  altmetricScore?: number;
  methodology?: {
    doi: string;
    badges: string[];
  };
  bibtex?: string;
  embedding?: number[];

  constructor({
    id,
    title,
    authors,
    abstract,
    source,
    sourceId,
    category = 'quant-ph',
    abstractBadge,
    tags = [],
    date,
    citations = 9,
    likes = 34,
    saves = 12,
    altmetricScore = 99.2,
    methodology,
    bibtex,
    embedding,
  }: PaperData) {
    this.id = id;
    this.title = title || 'Untitled Preprint';
    this.sourceId = sourceId || id;
    this.category = category;
    this.abstractBadge = abstractBadge;
    this.date = typeof date === 'string' ? date : 'Sep 28, 2026';

    if (Array.isArray(authors)) {
      this.authorList = authors;
      this.authors = authors.map((a) => a.name).join(', ');
    } else {
      this.authors = authors || 'Unknown Author';
      this.authorList = this.authors.split(',').map((n) => ({ name: n.trim() }));
    }

    if (Array.isArray(abstract)) {
      this.abstractParagraphs = abstract;
      this.abstract = abstract.join('\n\n');
    } else {
      this.abstract = abstract || '';
      this.abstractParagraphs = this.abstract.split('\n\n').filter(Boolean);
      if (this.abstractParagraphs.length === 0) {
        this.abstractParagraphs = [this.abstract];
      }
    }

    this.source = source || 'arXiv';
    this.rawDate = date ? new Date(date) : 'None';
    this.tags = tags;
    this.citations = citations;
    this.likes = likes;
    this.saves = saves;
    this.altmetricScore = altmetricScore;
    this.methodology = methodology;
    this.bibtex =
      bibtex ||
      `@article{paperfeed_${this.id.replace(/[^a-zA-Z0-9]/g, '_')},
  title={${this.title}},
  author={${this.authors}},
  journal={${this.source}},
  year={${new Date().getFullYear()}}
}`;
    this.embedding = embedding;
  }

  get formattedDate(): string {
    if (this.rawDate === 'None' || isNaN(this.rawDate.getTime())) {
      return 'Sep 28, 2026';
    }
    return this.rawDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  get publicationDate(): Date {
    if (this.rawDate instanceof Date && !isNaN(this.rawDate.getTime())) {
      return this.rawDate;
    }
    if (this.date) {
      const parsed = new Date(this.date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date('2026-09-28');
  }

  get pdfUrl(): string {
    let paperId = this.id;
    if (paperId.startsWith('paper-') && this.sourceId) {
      paperId = this.sourceId.split(' ')[0];
    }

    try {
      if (this.source === 'arXiv') {
        paperId = paperId.includes('/abs/')
          ? paperId.split('/abs/')[1]
          : paperId.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '');
        paperId = paperId.replace(/\.pdf$/, '');
        console.log(`%c[Paper] getting pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://arxiv.org/pdf/${paperId}.pdf#view=FitH`;
      }
      if (this.source === 'chemRxiv') {
        paperId = paperId.includes('.org/') ? paperId.split('.org/')[1] : paperId;
        console.log(`%c[Paper] getting pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://chemrxiv.org/doi/pdf/${paperId}`;
      }
      if (this.source === 'bioRxiv') {
        paperId = paperId.includes('.org/') ? paperId.split('.org/')[1] : paperId;
        console.log(`%c[Paper] getting pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://biorxiv.org/content/${paperId}.full.pdf`;
      }
    } catch (e) {
      console.log(`%c[Paper] problem with PDF of: "${paperId}" Error: "${e}"`, "color: #cc66ff;");
      return this.id; // Fallback
    }
    return this.id;
  }
}
