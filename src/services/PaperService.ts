import Paper from '../models/Paper';

export default class PaperService {
  static CROSSREF_PREFIXES: Record<string, string> = {
    chemrxiv: '10.26434',
    biorxiv: '10.1101',
    arxiv: '10.48550', //fallback
  };

  static max_entries = 10;

  static async fetchArxiv(searchQuery: string, offset = 0): Promise<Paper[]> {
    console.log(
      `%c[API Request; Arxiv] Fetching records from arXiv matching query: "${searchQuery}". Offset: ${offset}`,
      "color: #cc66ff;"
    );
    const url = `/api/arxiv/query?search_query=all:${encodeURIComponent(
      searchQuery
    )}&start=${offset}&max_results=${this.max_entries}&sortBy=submittedDate&sortOrder=descending`;
    console.log(`[API Request; Arxiv] Preparing to fetch ${url}.`);

    try {
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      } catch {
        return this.fetchCrossrefSource('arxiv', searchQuery, offset);
      }

      console.log(`[API Response; Arxiv] Status: ${response.status} ${response.statusText} ${response.ok}`);

      if (!response.ok) {
        return this.fetchCrossrefSource('arxiv', searchQuery, offset);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const entries = xmlDoc.getElementsByTagName('entry');

      console.log(`[API Parser; Arxiv] Successfully isolated ${entries.length} document nodes from XML payload.`);

      const parsedPapers = Array.from(entries)
        .filter((entry, index) => {
          const good_entry = entry.getElementsByTagName('summary')[0]?.textContent ? true : false;
          if (!good_entry) {
            console.log(
              `[API Parser; Arxiv] Problematic entry ${
                entry.getElementsByTagName('id')[0]?.textContent || `paper-${index}`
              }`
            );
          }
          return good_entry;
        })
        .map((entry, index) => {
          const title = entry.getElementsByTagName('title')[0]?.textContent || 'No Title';
          const abstract = entry.getElementsByTagName('summary')[0]?.textContent || 'No Abstract';
          const authorNodes = entry.getElementsByTagName('author');
          const authors = Array.from(authorNodes)
            .map((node) => node.getElementsByTagName('name')[0]?.textContent)
            .filter(Boolean)
            .join(', ');
          const categoryNodes = entry.getElementsByTagName('category');
          const tags = Array.from(categoryNodes)
            .map((node) => node.getAttribute('term'))
            .filter((t): t is string => Boolean(t))
            .slice(0, 3);
          const dateNode = entry.getElementsByTagName('published')[0]?.textContent;

          return new Paper({
            id: entry.getElementsByTagName('id')[0]?.textContent || `paper-${index}`,
            title: title.replace(/\s+/g, ' ').trim(),
            abstract: abstract.replace(/\s+/g, ' ').trim(),
            authors: authors || 'Unknown Author',
            source: 'arXiv',
            tags: tags.length ? tags : ['quant-ph'],
            date: dateNode || '2026-09-28',
            citations: 0,
            likes: 0,
            saves: 0,
          });
        });

      return parsedPapers;
    } catch (error) {
      console.error(`%c[API Error; Arxiv] Extraction sequence terminated unexpectedly:`, "color: red;", error);
      return [];
    }
  }

  static async fetchCrossrefSource(
    sourceKey: 'biorxiv' | 'chemrxiv' | 'arxiv',
    searchQuery: string,
    offset = 0
  ): Promise<Paper[]> {
    const prefix = this.CROSSREF_PREFIXES[sourceKey];
    if (!prefix) {
      console.error(`%c[API Error; Crossref ${sourceKey}] Uknknown repository`, "color: red;", sourceKey);
      return [];
    }
    console.log(
      `%c[API Request; Crossref ${sourceKey}] Fetching records from "${sourceKey}" matching query: "${searchQuery}". Offest: ${offset}`,
      "color: #cc66ff;"
    );
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(
      searchQuery
    )}&filter=prefix:${prefix}&rows=${this.max_entries}&offset=${offset}&sort=published`;
    console.log(`[API Request; Crossref ${sourceKey}] Preparing to fetch ${url}.`);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      console.log(`[API Response; Crossref ${sourceKey}] Status: ${response.status} ${response.statusText}`);
      if (!response.ok) return [];

      const json = await response.json();
      const entries = json.message?.items || [];
      console.log(`[API Parser; Crossref ${sourceKey}] Successfully isolated ${entries.length} document nodes from JSON payload.`);

      return (entries as Record<string, any>[])
        .filter((entry, index) => {
          const good_entry = entry.abstract ? true : false;
          if (!good_entry) {
            console.log(`[API Parser; Crossref ${sourceKey}] Problematic entry ${entry.URL || `${sourceKey}-${index}-${offset}`}`);
          }
          return good_entry;
        })
        .map((entry, index) => {
          const title = entry.title?.[0] || 'No Title';
          const abstract = entry.abstract ? entry.abstract : 'No Abstract';
          const authors =
            entry.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`).join(', ') || 'Unknown Author';
          const tags = [sourceKey.toUpperCase(), 'Preprint'];
          const dateNode = entry.created?.['date-time'] || 'Unknown date';
          const resolvedSource =
            sourceKey === 'biorxiv' ? 'bioRxiv' : sourceKey === 'chemrxiv' ? 'chemRxiv' : 'arXiv';

          return new Paper({
            id: entry.URL || `${sourceKey}-${index}-${offset}`,
            title: title,
            abstract: abstract.replace(/<[^>]*>?/gm, ''),
            authors: authors,
            source: resolvedSource,
            tags: tags,
            date: dateNode,
            citations: typeof entry['is-referenced-by-count'] === 'number' ? entry['is-referenced-by-count'] : 0,
            likes: 0,
            saves: 0,
          });
        });
    } catch (error) {
      console.error(`%c[API Error; Crossref ${sourceKey}] Extraction sequence terminated unexpectedly:`, "color: red;", error);
      return [];
    }
  }

  static async fetchAllSources(
    query: string,
    selectedSources: string[] = [],
    offset = 0,
    max_entries = 6
  ): Promise<Paper[]> {
    if (!query || selectedSources.length === 0) {
      console.error(`%c[App State] No query or active repository`, "color: red;", query, selectedSources);
      return [];
    }
    this.max_entries = max_entries;

    const fetchPromises = selectedSources.map((source) => {
      switch (source) {
        case 'arxiv':
          return this.fetchArxiv(query, offset);
        case 'biorxiv':
          return this.fetchCrossrefSource('biorxiv', query, offset);
        case 'chemrxiv':
          return this.fetchCrossrefSource('chemrxiv', query, offset);
        default:
          console.error(`%c[App State] Unknown repository`, "color: red;", source);
          return Promise.resolve([]);
      }
    });

    const resultsSettled = await Promise.allSettled(fetchPromises);
    const resultsArray = resultsSettled
      .filter((r): r is PromiseFulfilledResult<Paper[]> => r.status === 'fulfilled')
      .map((r) => r.value);
    console.log(`%c[API Parser] Final fetched number of papers is ${resultsArray.flat().length}`, "color: green;");

    const flat = resultsArray.flat();
    if (flat.length === 0) {
      return [];
    }

    return flat.sort((a, b) => {
      const timeA = a.rawDate instanceof Date ? a.rawDate.getTime() : 0;
      const timeB = b.rawDate instanceof Date ? b.rawDate.getTime() : 0;
      return timeB - timeA;
    });
  }
}
