import Paper from '../models/Paper';

export default class PaperService {

  static CROSSREF_PREFIXES = {
    chemrxiv: '10.26434',
    biorxiv: '10.1101',
  };
  max_entries = 10;

  static async fetchArxiv(searchQuery, offset = 0) {
    console.log(`%c[API Request; Arxiv] Fetching records from arXiv matching query: "${searchQuery}". Offset: ${offset}`, "color: #cc66ff;");
    const url = `/api/arxiv/query?search_query=all:${encodeURIComponent(searchQuery)}&start=${offset}&max_results=${this.max_entries}&sortBy=submittedDate&sortOrder=descending`;
    console.log(`[API Request; Arxiv] Preparing to fetch ${url}.`);
    try {
      const response = await fetch(url);
      console.log(`[API Response; Arxiv] Status: ${response.status} ${response.statusText}`);
      if (!response.ok) return [];
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const entries = xmlDoc.getElementsByTagName("entry");
      
      console.log(`[API Parser; Arxiv] Successfully isolated ${entries.length} document nodes from XML payload.`);

      return Array.from(entries).filter((entry) => {
          const good_entry =  entry.getElementsByTagName("summary")[0]?.textContent? true : false;
          if (!good_entry) { 
              console.log(`[API Parser; Arxiv] Problematic entry ${entry.getElementsByTagName("id")[0]?.textContent || `paper-${index}`}`);

          }
          return good_entry;
        }).map((entry, index) => { 
          const title = entry.getElementsByTagName("title")[0]?.textContent || "No Title";
          const abstract = entry.getElementsByTagName("summary")[0]?.textContent || "No Abstract";

          const authorNodes = entry.getElementsByTagName("author");
          const authors = Array.from(authorNodes).map(node => node.getElementsByTagName("name")[0]?.textContent).join(", ");
          const categoryNodes = entry.getElementsByTagName("category");
          const tags = Array.from(categoryNodes).map(node => node.getAttribute("term")).slice(0, 3);
          const dateNode = entry.getElementsByTagName("published")[0]?.textContent;

          return new Paper({
            id: entry.getElementsByTagName("id")[0]?.textContent || `paper-${index}`,
            title: title.replace(/\s+/g, " ").trim(),
            abstract: abstract.replace(/\s+/g, " ").trim(),
            authors: authors,
            source: 'arXiv',
            tags: tags,
            date: dateNode
        });
      });
    } catch (error) {
      console.error(`%c[API Error; Arxiv] Extraction sequence terminated unexpectedly:`, "color: red;", error);
      return [];
    }
  }
  static async fetchCrossrefSource(sourceKey, searchQuery, offset = 0) {
    const prefix = this.CROSSREF_PREFIXES[sourceKey];
    if (!prefix) {
        console.error(`%c[API Error; Crossref ${sourceKey}] Uknknown repository`, "color: red;", sourceKey);
        return [];
    }

    console.log(`%c[API Request; Crossref ${sourceKey}] Fetching records from "${sourceKey}" matching query: "${searchQuery}". Offest: ${offset}`, "color: #cc66ff;");
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&filter=prefix:${prefix}&rows=${this.max_entries}&offset=${offset}&sort=published`;
    console.log(`[API Request; Crossref ${sourceKey}] Preparing to fetch ${url}.`);

    try {
      const response = await fetch(url);
      console.log(`[API Response; Crossref ${sourceKey}] Status: ${response.status} ${response.statusText}`);
      if (!response.ok) return [];

      const json = await response.json();
      const entries = json.message?.items || [];
      console.log(`[API Parser; Crossref ${sourceKey}] Successfully isolated ${entries.length} document nodes from JSON payload.`);
      return Array.from(entries).filter((entry) => {
            const good_entry = entry.abstract ? true : false;
            if (!good_entry) {
              console.log(`[API Parser; Crossref ${sourceKey}] Problematic entry ${entry.URL || `${sourceKey}-${index}-${offset}`}`);
            }
            return good_entry;
          }).map((entry, index) => { 
            const title = entry.title?.[0] || "No Title";
            const abstract =  entry.abstract ? entry.abstract : "No Abstract";
            const authors = entry.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(", ") || "Unknown Author";
            const tags = [sourceKey.toUpperCase(), "Preprint"];
            const dateNode = entry.created?.['date-time'] || 'Unknown date';

            return new Paper({
              id: entry.URL || `${sourceKey}-${index}-${offset}`,
              title: title,
              abstract: abstract.replace(/<[^>]*>?/gm, ''),
              authors: authors, 
              source: sourceKey === 'biorxiv' ? 'bioRxiv' : 'chemRxiv',
              tags: tags,
              date: dateNode,
          });
      });
    } catch (error) {
      console.error(`%c[API Error; Crossref ${sourceKey}] Extraction sequence terminated unexpectedly:`, "color: red;", error);
      return [];
    }
  }
  static async fetchAllSources(query, selectedSources = [], offset = 0, max_entries=6) {
    if (!query || selectedSources.length === 0) {
        console.error(`%c[App State] No query or active repository`, "color: red;", query, selectedSources);
        return [];
    }
    this.max_entries = max_entries;
    const fetchPromises = selectedSources.map(source => {
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

    const resultsArray = await Promise.all(fetchPromises);
    console.log(`%c[API Parser] Final fetched number of papers is ${resultsArray.flat().length}`, "color: green;");

    
    return resultsArray.flat().sort((a, b) => new Date(b.formattedDate) - new Date(a.formattedDate));
  }
}
