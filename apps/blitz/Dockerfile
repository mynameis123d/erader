# Blitz server: API, renderer (canvas + ffmpeg) and built web app in one container.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
# data/ holds keys.json, db.json and rendered media: mount a persistent volume here.
VOLUME ["/app/data"]
EXPOSE 8787
CMD ["npx", "tsx", "server/index.ts"]
