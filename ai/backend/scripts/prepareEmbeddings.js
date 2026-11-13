const path = require("path");
const { pipeline, env } = require("@huggingface/transformers");

env.cacheDir = path.resolve(__dirname, "../.cache/models");

pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
  dtype: "q8",
  device: "cpu",
})
  .then(() => console.log("Vietnamese embeddings are ready for local inference."))
  .catch((error) => {
    console.error("Could not prepare local embeddings:", error.message);
    process.exitCode = 1;
  });
