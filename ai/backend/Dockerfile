# Backend (Express + MongoDB). Dùng bản Debian slim vì onnxruntime-node
# (model embedding của bot ESH) không chạy trên Alpine/musl.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
# Không tải bản CUDA (GPU) của onnxruntime-node: embedding chạy trên CPU, và link tải CUDA có thể lỗi 404
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Tải sẵn model embedding vào .cache/models để lúc chạy không cần Internet
RUN npm run prepare:embeddings && chown -R node:node /app

USER node
EXPOSE 5000
CMD ["node", "server.js"]
