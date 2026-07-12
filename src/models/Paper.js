export default class Paper {
  constructor({ id, title, authors, abstract, source, tags, date }) {
    this.id = id;
    this.title = title;
    this.authors = authors;
    this.abstract = abstract;
    this.source = source || '';
    this.rawDate = date ? new Date(date) : "None";
    this.tags = tags;
  }

  get formattedDate() {
    return this.rawDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  get pdfUrl() {
    try {
	  if (this.source === 'arXiv') {
        const paperId = this.id.split('/abs/')[1];
	    console.log(`%c[Paper] opening pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://arxiv.org/pdf/${paperId}.pdf#view=FitH`;
	  }
	  if (this.source === 'chemRxiv') {
        const paperId = this.id.split('.org/')[1];
	    console.log(`%c[Paper] opening pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://chemrxiv.org/doi/pdf/${paperId}`;
	  }
	  if (this.source === 'bioRxiv') {
        const paperId = this.id.split('.org/')[1];
	    console.log(`%c[Paper] opening pdf: "${paperId}" `, "color: #cc66ff;");
        return `https://biorxiv.org/content/${paperId}.full.pdf`;
	  }
    } catch (e) {
	  console.log(`%c[Paper] problem with PDF of: "${paperId}" Error: "{e}"`, "color: #cc66ff;");
      return this.id; // Fallback 
    }
  }
}

