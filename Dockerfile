# kirAI production image: build the Vite client, then serve API + static UI
# from one Node process on PORT. SQLite lives in /app/server/data, so mount a
# persistent volume there or the database is lost on redeploy.
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=4000
EXPOSE 4000
VOLUME ["/app/server/data"]

CMD ["npm", "start"]
