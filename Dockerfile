# -------------------------------
# FRONTEND BUILD STAGE
# Build frontend build export dist folder 
# -------------------------------

FROM node:23-alpine AS temp-frontend
# Need python for node-gyp in building
RUN apk --update --no-cache add \
    libc6-compat \
    automake \
    libtool \
    autoconf \
    build-base \
    zlib \
    zlib-dev \
    python3 make gcc g++

WORKDIR /home/rldashboard/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy in frontend source
COPY frontend/ .

# Temporary setup - need local env as the 'production' build is landing page only
ARG API_URL="/"

ENV VITE_API_URL=$API_URL
ENV NODE_ENV=local
RUN npm run build
# -------------------------------


# -------------------------------
# BASE BUILD
# -------------------------------
FROM python:3.11-slim AS base

WORKDIR /home/rldashboard/backend

# set env variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV UV_COMPILE_BYTECODE=1

# Install postgres connector dependencies
RUN apt update && apt install --no-install-recommends libpq5 -y

RUN mkdir -p /home/rldashboard/backend

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Mount the lock and pyproject.toml to speed up image build time if these files are not changed
COPY backend/uv.lock backend/pyproject.toml ./
RUN uv sync --no-dev --frozen --no-install-project --compile-bytecode


ENV PATH="/home/rldashboard/backend/.venv/bin:$PATH"

# Copy in backend files
COPY backend/*.py .
COPY backend/samples ./samples
COPY backend/rldashboard ./rldashboard
COPY backend/alembic ./alembic
COPY backend/templates ./templates
COPY backend/alembic.ini .

WORKDIR /home/rldashboard

RUN mkdir -p /home/.rldashboard

ENV DATABASE_URL="postgresql+asyncpg://postgres:secret@localhost:5432/rldashboard"
ENV DATA_DIRECTORY="/home/.rldashboard/data"

# -------------------------------
# SPA BUILD WITH MINIMAL DEPS
# -------------------------------
FROM base AS spa

WORKDIR /home/rldashboard/backend

# Copy in frontend build so we can serve it from FastAPI
COPY --from=temp-frontend /home/rldashboard/frontend/dist /home/rldashboard/frontend/dist
RUN \
    cp -r /home/rldashboard/frontend/dist/assets /home/rldashboard/backend && \
    cp /home/rldashboard/frontend/dist/favicon.ico /home/rldashboard/backend/assets && \
    cp /home/rldashboard/frontend/dist/.vite/manifest.json /home/rldashboard/backend/assets

# This stage is meant to be used as an SPA server with FastAPI serving a React build
ENV SPA_MODE=1
ARG AUTH_USERNAME
ENV AUTH_USERNAME=$AUTH_USERNAME
ARG AUTH_PASSWORD
ENV AUTH_PASSWORD=$AUTH_PASSWORD
ARG ALLOWED_ORIGINS
ENV ALLOWED_ORIGINS=$ALLOWED_ORIGINS


# Running alembic and uvicorn without combining them in a bash -c command won't work
CMD ["bash", "-c", "python -m rldashboard.main"]

