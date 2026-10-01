# Builds the frontend and serves it as static files.
# Only used for running the whole stack locally: on Timeweb the panel builds
# the frontend itself and serves the result.

FROM node:24-slim AS build

WORKDIR /app


COPY package.json package-lock.json ./


RUN npm ci


COPY . .


# Baked into the bundle at build time, so changing it needs a rebuild.
ARG VITE_API_URL=http://localhost:8000

ENV VITE_API_URL=$VITE_API_URL


RUN npm run build


FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
