# RLDashboard Backend

- [Installation](#installation)
- [Environment setup](#environment-setup)
- [Running the backend](#running-the-backend)
- [Alembic Migrations](#alembic-migrations)
- [Current state](#current-state)
  - [pre-commit](#pre-commit)

## Installation

Make sure you have uv installed from their [official website](https://docs.astral.sh/uv/getting-started/installation/#standalone-installer).
We're going with 3.11 for now cause of all the nice features.

```bash
uv sync
```

# Define a custom DATABASE_URL

```
export DATABASE_URL="postgresql+asyncpg://postgres:secret@localhost:5432/rldashboard" # Define app storage DB

uv run alembic upgrade head # Run migrations
```

# CORS settings

Set the environment variable `ALLOWED_ORIGINS` to a comma-separated list of origins if you're deploying this to a custom domain.

## Environment setup

Currently, the environment can be setup through the settings page on the frontend.

![Environment settings page](../media/env-settings.png)

You only need an OpenAI API key to start using RLDashboard. You may optionally use Langsmith to record logs for your LLM flow.

!NOTE that adding Langsmith will send the graph state to Langsmith to log. The graph state includes your **private results**. Only enable this feature if you are okay with sharing your data with Langsmith. We use this mainly for debugging during development.

## Running the backend

Run migrations if needed:

```bash
uv run alembic upgrade head
```

You can then run uvicorn to start the backend:

```bash
# don't forget to specify your app storage database URL
# export DATABASE_URL="postgresql+asyncpg://postgres:secret@localhost:5432/rldashboard"

uv run uvicorn rldashboard.main:app --reload --port=7377
```

To run tests: `uv run pytest . -vv`

## Alembic Migrations

Storage migrations run against PostgreSQL. Set `DB_SCHEMA` in your environment to control the target schema, then run:

```bash
uv run alembic upgrade head
```

Use PostgreSQL-native migration commands in new revisions.

## Current state

They stay if you ship something you're proud of, you've shipped too late.

- ~~Currently some raw SQL from the very early MVP remains and is being replaced with SQLAlchemy queries.~~
- ~~The LLM querying code is also pretty non-generic and hard to extend, so that will soon be replaced with some "Agent" implementation.~~

### pre-commit

```
uv run pre-commit install
```

# Example DBMS-based databases

## SQL Server:

`docker run -p 1433:1433 -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=My_password1' -d chriseaton/adventureworks:latest`
DSN: `mssql://SA:My_password1@localhost/AdventureWorks?TrustServerCertificate=yes&driver=ODBC+Driver+18+for+SQL+Server`

## PostgreSQL:

Build & Run image locally: `bash ./scripts/postgres_img_with_sample_data.sh`

DSN: `postgres://postgres:dvdrental@localhost:5432/dvdrental`

## MySQL:

`docker run -p 3306:3306 -d sakiladb/mysql`

DSN: `mysql://sakila:p_ssW0rd@127.0.0.1:3306/sakila`
