# Frontend Dockerfile (./frontend/Dockerfile)
FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./

RUN yarn install --frozen-lockfile

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S reactuser -u 1001

RUN chown -R reactuser:nodejs /app
USER reactuser

CMD ["yarn", "dev"]