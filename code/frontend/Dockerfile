# Two stages: build the static site, serve it with nginx. The design is a
# static frontend; anything that needs a server is the backend's.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --include=dev
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# nginx binds every address regardless; the line is kept because the scaffold
# guard (internal/tooling/scaffold_guard.go) requires it of every frontend
# Dockerfile, and an agent rewriting this file is refused without it.
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/dist /usr/share/nginx/html
# No page may frame the published site (the Studio frames the workspace's
# preview, never this), and browsers do not guess content types. \047 is a
# single quote, which printf's own quoting cannot hold.
RUN printf 'server { listen 3000; root /usr/share/nginx/html; add_header Content-Security-Policy "frame-ancestors \047none\047" always; add_header X-Content-Type-Options nosniff always; location / { try_files $uri $uri/ /index.html; } }\n' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
