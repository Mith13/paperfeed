import { env, AutoModel, AutoTokenizer, Tensor } from '@huggingface/transformers';

export default class RecommenderEngine {
  static embedder = null;
  static embedderPromise = null; 

  static model_id = 'minishlab/potion-base-2M';
  
  static async init() {
    if (this.embedderPromise) {
        console.log("%c[AI Engine] Transformed model already promised ...", "color: #ff9900; font-weight: bold;");
        return this.embedderPromise;
    }
    this.embedderPromise = (async () => {
      console.log(`%c[AI Engine] Initializing Transformer model (${this.model_id}) via ${navigator?.gpu}...`, "color: #ff9900; font-weight: bold;");
      const startTime = performance.now();
      try {
        this.embedder = await this._createEmbedder(this.model_id, 
                 {
                  model_type: "model2vec",
                  model_revision : "main",
                  tokenizer_revision : "main",
                  device: navigator?.gpu ? "webgpu" : "wasm",
                  dtype: "fp32",
                 });
        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`%c[AI Engine] Model loaded successfully in ${duration}ms via ${navigator?.gpu ? "webgpu" : "wasm"}.`, "color: #00cc66; font-weight: bold;");
      } catch (error) {
        this.embedderPromise = null
        console.error("[AI Engine] Failed to initialize model:", error);
        throw error;
      }
    })();
    return this.embedderPromise;
  }

  // taken from https://github.com/MinishLab/model2vec/issues/75
  static async  _createEmbedder(model_name, options = {}) {
    const { 
      model_type = "model2vec",
      model_revision = "main", 
      tokenizer_revision = "main", 
      device = "wasm", 
      dtype = "fp32", 
    } = options;

    const model = await AutoModel.from_pretrained(model_name, {
      config: { model_type },
      revision: model_revision,
      device,
      dtype,
    });
    const tokenizer = await AutoTokenizer.from_pretrained(model_name, {
      revision: tokenizer_revision,
    });

    return async (texts) => {
      const { input_ids } = await tokenizer(texts, {
        add_special_tokens: false,
        return_tensor: false,
      });

      const offsets = [0];
      for (let i = 0; i < input_ids.length - 1; i++) {
        offsets.push(offsets[i] + input_ids[i].length);
      }

      const flattened_input_ids = input_ids.flat();
	  const model_inputs = {
	    input_ids: new Tensor("int64", BigInt64Array.from(flattened_input_ids.map(BigInt)), [flattened_input_ids.length]),
	    offsets: new Tensor("int64", BigInt64Array.from(offsets.map(BigInt)), [offsets.length]),
	  };
      const { embeddings } = await model(model_inputs);
      return embeddings;
    };
  }


  static async getEmbedding(paper) {
    await this.init();
    console.log(`[AI Engine] Computing vector embedding for paper ID: ${paper.id}`);
    const startTime = performance.now();
    
    const textToEmbed = `${paper.title}. ${paper.abstract}`;
    const output = await this.embedder([textToEmbed]);
    const vector = output.tolist()[0];
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[AI Engine] Embedding generated in ${duration}ms. Vector length: ${vector.length} dimensions.`);
    return vector;
  }

  static cosineSimilarity(vecA, vecB) {
    return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  }

  static async rankPapers(incomingPapers, likedPapers, minSimilarity=0) {
    console.log(`%c[Recommender] Processing feed sorting. Incoming papers: ${incomingPapers.length}, Reference liked history: ${likedPapers.length}`, "color: #4da6ff;");
    
    if (likedPapers.length === 0) {
      console.log("[Recommender] No liked papers found in history. Skipping sorting pipeline.");
      return incomingPapers;
    }

    const startTime = performance.now();

    // 1. Ensure liked papers have vectors
    for (let paper of likedPapers) {
      if (!paper.embedding) {
        console.warn(`[Recommender] Liked paper missing embedding cache. Re-generating for: "${paper.title.substring(0, 30)}..."`);
        paper.embedding = await this.getEmbedding(paper);
      }
    }

    // 2. Vector match incoming papers
    const rankedPapers = await Promise.all(
      incomingPapers.map(async (paper,idx) => {
        try {
            if (!paper.embedding) {
              paper.embedding = await this.getEmbedding(paper);
            }
        } catch (error) {
            console.error(`[Recommender] Error during embedding paper ${idx}`,error)
            throw (error)
        }

        let highestScore = 0;
        likedPapers.forEach(liked => {
          const score = this.cosineSimilarity(paper.embedding, liked.embedding);
          if (score > highestScore) highestScore = score;
        });

        return { paper, score: highestScore };
      })
    );

    // 3. Sort
    const sorted = rankedPapers
      .filter(paper => paper.score > minSimilarity/100)
      .sort((a, b) => b.score - a.score)
      .map(item => {
        console.log(`[Recommender Score] Match certainty: ${(item.score * 100).toFixed(1)}% -> "${item.paper.title}..."`);
        return item.paper;
      });

    const totalDuration = (performance.now() - startTime).toFixed(2);
    console.log(`%c[Recommender] Re-ranking cycle finished in ${totalDuration}ms. Kept ${sorted.length} out of ${rankedPapers.length}`, "color: #00cc66; font-weight: bold;");
    return sorted;
  }
}
