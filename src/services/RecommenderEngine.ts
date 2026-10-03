import Paper from '../models/Paper';
import { env, AutoModel, AutoTokenizer, Tensor } from '@huggingface/transformers';

export default class RecommenderEngine {
  static embedder: any = null;
  static embedderPromise: Promise<any> | null = null;
  static model_id = 'minishlab/potion-base-2M';
  static modelFailed = false;

  static async init() {
    if (this.modelFailed) return null;
    if (this.embedderPromise) {
      console.log("%c[AI Engine] Transformed model already promised ...", "color: #ff9900; font-weight: bold;");
      return this.embedderPromise;
    }

    this.embedderPromise = (async () => {
      const gpuNav = typeof navigator !== 'undefined' && (navigator as any)?.gpu;
      console.log(`%c[AI Engine] Initializing Transformer model (${this.model_id}) via ${gpuNav}...`, "color: #ff9900; font-weight: bold;");
      const startTime = performance.now();

      try {
        const device = gpuNav ? 'webgpu' : 'wasm';
        this.embedder = await this._createEmbedder(this.model_id,
                 {
                  model_type: "model2vec",
                  model_revision : "main",
                  tokenizer_revision : "main",
                  device: device,
                  dtype: "fp32",
                 });
        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`%c[AI Engine] Model loaded successfully in ${duration}ms via ${gpuNav ? "webgpu" : "wasm"}.`, "color: #00cc66; font-weight: bold;");
        return this.embedder;
      } catch (error) {
        this.modelFailed = true;
        this.embedderPromise = null;
        console.error("[AI Engine] Failed to initialize model:", error);
        return null;
      }
    })();

    return this.embedderPromise;
  }

  // taken from https://github.com/MinishLab/model2vec/issues/75
  static async _createEmbedder(model_name: string, options: Record<string, any> = {}) {
    const {
      model_type = "model2vec",
      model_revision = "main",
      tokenizer_revision = "main",
      device = "wasm",
      dtype = "fp32",
    } = options;

    const model = await AutoModel.from_pretrained(model_name, {
      config: { model_type } as any,
      revision: model_revision,
      device,
      dtype,
    });
    const tokenizer = await AutoTokenizer.from_pretrained(model_name, {
      revision: tokenizer_revision,
    });

    return async (texts: string[]) => {
      const { input_ids } = (await tokenizer(texts, {
        add_special_tokens: false,
        return_tensor: false,
      })) as any;

      const offsets = [0];
      for (let i = 0; i < input_ids.length - 1; i++) {
        offsets.push(offsets[i] + input_ids[i].length);
      }

      const flattened_input_ids = input_ids.flat();
      const model_inputs = {
        input_ids: new Tensor("int64", BigInt64Array.from(flattened_input_ids.map(BigInt)), [flattened_input_ids.length]),
        offsets: new Tensor("int64", BigInt64Array.from(offsets.map(BigInt)), [offsets.length]),
      };
      const { embeddings } = await (model as any)(model_inputs);
      return embeddings;
    };
  }

  static async getEmbedding(paper: Paper): Promise<number[]> {
    console.log(`[Recommender] Computing vector embedding for paper ID: ${paper.id}`);
    const startTime = performance.now();
    const textToEmbed = `${paper.title}. ${paper.abstract}`;

    let vector: number[] = [];
    try {
      const embedder = await this.init();
      if (embedder) {
        const output = await embedder([textToEmbed]);
        vector = output.tolist()[0];
      } else {
        console.error('[Recommender] Recommender model in unavailable');
      }
    } catch (error) {
      console.error(`[Recommender] Unable to get an embedding for ${paper.id}`, error);
    }

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[Recommender] Embedding generated in ${duration}ms. Vector length: ${vector.length} dimensions.`);
    return vector;
  }

  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Sorts a newly fetched batch of papers based on cosine similarity against saved papers.
   * Keeps all papers in the batch, sorted descending by highest cosine similarity.
   */
  static async sortPapersBySaved(
    papersToSort: Paper[],
    savedList: Paper[]
  ): Promise<Paper[]> {
    if (!savedList || savedList.length === 0 || !papersToSort || papersToSort.length === 0) {
      return papersToSort;
    }

    console.log(
      `%c[Recommender] Sorting new batch (${papersToSort.length} papers) by cosine similarity against ${savedList.length} saved papers`,
      'color: #00cc88;'
    );

    // 1. Ensure saved papers have embeddings
    for (const s of savedList) {
      if (!s.embedding || s.embedding.length === 0) {
        try {
          s.embedding = await this.getEmbedding(s);
        } catch (err) {
          console.warn('[Recommender] Failed to embed saved paper:', err);
        }
      }
    }

    // 2. Compute similarity for each incoming paper against savedList
    const scored = await Promise.all(
      papersToSort.map(async (paper) => {
        if (!paper.embedding || paper.embedding.length === 0) {
          try {
            paper.embedding = await this.getEmbedding(paper);
          } catch (err) {
            console.warn('[Recommender] Failed to embed incoming paper:', err);
          }
        }

        let highestCosineSim = 0;
        if (paper.embedding && paper.embedding.length > 0) {
          for (const s of savedList) {
            if (s.embedding && s.embedding.length > 0) {
              const sim = this.cosineSimilarity(paper.embedding, s.embedding);
              if (sim > highestCosineSim) highestCosineSim = sim;
            }
          }
        } else {
          // Fallback to tag similarity
          for (const s of savedList) {
            const shared = (paper.tags || []).filter((t) => (s.tags || []).includes(t)).length;
            if (shared * 0.15 > highestCosineSim) highestCosineSim = shared * 0.15;
          }
        }

        return { paper, similarity: highestCosineSim };
      })
    );

    // 3. Sort descending by cosine similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    console.log(
      `[Recommender] New batch sorted by similarity: ${scored
        .map((s) => `${(s.similarity * 100).toFixed(0)}%`)
        .join(', ')}`
    );

    return scored.map((item) => item.paper);
  }

  static async rankPapers(
    incomingPapers: Paper[],
    likedPapers: Paper[],
    minSimilarity = 0
  ): Promise<Paper[]> {
    console.log(`%c[Recommender] Processing feed sorting. Incoming papers: ${incomingPapers.length}, Reference liked history: ${likedPapers.length}`, "color: #4da6ff;");

    if (likedPapers.length === 0) {
      console.log("[Recommender] No liked papers found in history. Skipping sorting pipeline.");
      return incomingPapers;
    }

    const startTime = performance.now();

    // 1. Ensure liked papers have vectors
    for (const paper of likedPapers) {
      if (!paper.embedding) {
        console.warn(`[Recommender] Liked paper missing embedding cache. Re-generating for: "${paper.title.substring(0, 30)}..."`);
        paper.embedding = await this.getEmbedding(paper);
      }
    }

    // 2. Vector match incoming papers
    const rankedPapers = await Promise.all(
      incomingPapers.map(async (paper, idx) => {
        try {
          if (!paper.embedding) {
            paper.embedding = await this.getEmbedding(paper);
          }
        } catch (error) {
          console.error(`[Recommender] Error during embedding paper ${idx}`, error);
          throw error;
        }

        let highestScore = 0;
        likedPapers.forEach((liked) => {
          if (liked.embedding) {
            const score = this.cosineSimilarity(paper.embedding!, liked.embedding);
            if (score > highestScore) highestScore = score;
          }
        });
        return { paper, score: highestScore };
      })
    );

    // 3. Sort
    const sorted = rankedPapers
      .filter((item) => item.score > minSimilarity / 100)
      .sort((a, b) => b.score - a.score)
      .map((item) => {
        console.log(`[Recommender Score] Match certainty: ${(item.score * 100).toFixed(1)}% -> "${item.paper.title}..."`);
        return item.paper;
      });

    const totalDuration = (performance.now() - startTime).toFixed(2);
    console.log(`%c[Recommender] Re-ranking cycle finished in ${totalDuration}ms. Kept ${sorted.length} out of ${rankedPapers.length}`, "color: #00cc66; font-weight: bold;");

    return sorted.length > 0 ? sorted : incomingPapers;
  }
}

