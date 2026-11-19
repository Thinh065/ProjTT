const CHUNK_SIZE = 1200;

// Chia Markdown theo heading ##/###, mỗi phần cắt thành các đoạn ~1200 ký tự (có lặp lại heading)
function chunkMarkdown(text) {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\[cite_start\]|\[cite:[^\]]*\]/g, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const sections = clean.split(/\n(?=#{2,3} )/);
  const chunks = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split("\n", 1)[0];
    const heading = /^#{2,3} /.test(firstLine) ? firstLine : "";
    const body = heading ? trimmed.slice(firstLine.length).trim() : trimmed;

    if (!body) {
      if (heading) chunks.push(heading);
      continue;
    }

    const budget = Math.max(200, CHUNK_SIZE - heading.length - 1);
    for (let i = 0; i < body.length; i += budget) {
      const piece = body.slice(i, i + budget).trim();
      if (piece) chunks.push(heading ? `${heading}\n${piece}` : piece);
    }
  }
  return chunks;
}

module.exports = { chunkMarkdown, CHUNK_SIZE };
