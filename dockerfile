# -------- Stage 1: Node App bauen --------
FROM node:18-alpine AS nodeapp

WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm install --production

# App kopieren
COPY . .

# -------- Stage 2: Nginx + Node --------
FROM nginx:alpine

WORKDIR /app

# Node aus Stage 1 kopieren
COPY --from=nodeapp /usr/local/bin/node /usr/local/bin/node
COPY --from=nodeapp /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=nodeapp /app /app

# Nginx Config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Node starten, dann Nginx im Vordergrund
CMD node /app/app.js & nginx -g "daemon off;"