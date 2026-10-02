# Builds the frontend and serves it, proxying the API to the backend so the
# browser only ever talks to this one origin.
#
# Only used for running the whole stack locally: on Timeweb the panel builds
# the frontend itself and serves the result.

# Alpine for the same reason as backend/Dockerfile: on Docker before 20.10.10
# the glibc in the Debian-based node images cannot start threads, which
# breaks npm ci. The lockfile already carries the musl builds of the native
# packages (rolldown, lightningcss).
FROM node:24-alpine AS build

WORKDIR /app


COPY package.json package-lock.json ./


RUN npm ci


COPY . .


# Empty means same origin: nginx below forwards the API, so no server address
# has to be known at build time. Set it to a full URL to point the frontend at
# a backend somewhere else instead.
ARG VITE_API_URL=""

ENV VITE_API_URL=$VITE_API_URL


RUN npm run build


FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
