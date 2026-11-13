const path = require("path");
const { pipeline, env } = require("@huggingface/transformers");

const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
env.cacheDir = path.resolve(__dirname, "../.cache/models");
// Download once with scripts/prepareEmbeddings.js. Runtime inference stays local.
env.allowRemoteModels = false;
let encoderPromise;

async function embedTexts(texts) {
  if (!encoderPromise) {
    encoderPromise = pipeline("feature-extraction", EMBEDDING_MODEL, {
      dtype: "q8",
      device: "cpu",
    }).catch((error) => {
      encoderPromise = null;
      throw error;
    });
  }
  const encoder = await encoderPromise;
  const result = await encoder(texts, { pooling: "mean", normalize: true });
  return result.tolist();
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length) return 0;
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

module.exports = { embedTexts, cosineSimilarity, EMBEDDING_MODEL };
