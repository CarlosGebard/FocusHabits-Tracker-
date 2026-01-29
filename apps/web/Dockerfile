FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM caddy:2-alpine AS runner
WORKDIR /srv
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["caddy", "file-server", "--root", "/srv/dist", "--listen", ":4173"]
