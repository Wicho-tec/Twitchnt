FROM node:20-alpine

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl ffmpeg

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
