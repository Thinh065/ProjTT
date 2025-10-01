# Backend Dockerfile (./backend/Dockerfile)
FROM node:22.4.0-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /app
USER nestjs

CMD ["npm", "run", "start"]