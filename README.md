# LLM Ops — Triage Platform

A production-grade **LLM Operations platform** for automated support ticket triage. Built with FastAPI, React, and LiteLLM, it classifies incoming customer support tickets in real time using large language models — assigning priority, category, severity, confidence scores, and generating draft replies.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Prompt Engineering](#prompt-engineering)
- [Evaluation Framework](#evaluation-framework)
- [Observability](#observability)
- [Reliability Patterns](#reliability-patterns)
- [Testing](#testing)
- [Deployment](#deployment)
- [Load Testing](#load-testing)

---

## Overview

When a customer submits a support ticket, the platform:

1. **Sanitizes** the input (prompt injection protection)
2. **Renders** a versioned prompt template with the ticket text
3. **Sends** the prompt to an LLM via LiteLLM (with circuit breaker failover)
4. **Parses** the structured JSON response into a validated schema
5. **Stores** the result in SQLite with full metadata (latency, cost, tokens)
6. **Checks** escalation rules and triggers automated actions
7. **Returns** a rich triage result: priority, category, severity, confidence, summary, draft reply, extracted entities, and more

The entire pipeline runs in **< 2 seconds** per ticket, with full observability via Prometheus metrics and OpenTelemetry tracing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend (Vite)                       │
│   ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌───────┐ ┌─────────┐  │
│   │  Triage   │ │ Dashboard │ │ Analytics │ │ Rules │ │ A/B Test│  │
│   └────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───┬───┘ └────┬────┘  │
│        └──────────────┴─────────────┴───────────┴──────────┘       │
│                              │ HTTP (port 3000 → proxy → 8000)     │
└──────────────────────────────┼─────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (Uvicorn)                       │
│                                                                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐  │
│  │  API Layer   │───▶│  Triage Service   │───▶│  Prompt Registry   │  │
│  │  (app.py)    │    │  (triage.py)      │    │  (YAML + Jinja2)   │  │
│  └──────────────┘    │  - Sanitization   │    └────────────────────┘  │
│                      │  - OTel Tracing   │                            │
│                      └────────┬──────────┘                            │
│                               │                                       │
│                               ▼                                       │
│  ┌──────────────────────────────────────────┐                        │
│  │           LLM Gateway                     │                        │
│  │  ┌─────────────┐    ┌─────────────────┐  │                        │
│  │  │   Primary    │    │    Fallback     │  │                        │
│  │  │   Model      │    │    Model        │  │                        │
│  │  │  (Circuit    │──▶│   (Circuit      │  │                        │
│  │  │   Breaker)   │    │    Breaker)     │  │                        │
│  │  └──────┬───────┘    └───────┬────────┘  │                        │
│  │         │   Tenacity Retry   │            │                        │
│  │         └────────┬───────────┘            │                        │
│  └──────────────────┼───────────────────────┘                        │
│                     │                                                 │
│  ┌─────────────┐   │   ┌───────────────┐   ┌──────────────────────┐  │
│  │  SQLite DB  │◀──┘   │  Prometheus   │   │  OpenTelemetry       │  │
│  │  (WAL mode) │       │  Metrics      │   │  Tracing             │  │
│  └─────────────┘       └───────────────┘   └──────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                               │
                               ▼ LiteLLM SDK
                    ┌─────────────────────┐
                    │   LLM Provider      │
                    │   (Groq / OpenAI /  │
                    │    Anthropic / etc.) │
                    └─────────────────────┘
```

### Data Flow

```
User Input → Sanitize → Render Prompt → LLM Call → Parse JSON → Validate Schema
     → Save to DB → Check Escalation Rules → Return Response
```

---

## Tech Stack

| Layer           | Technology                                                      |
| --------------- | --------------------------------------------------------------- |
| **Frontend**    | React 18, Vite, Tailwind CSS v4, React Router, Recharts, Lucide |
| **Backend**     | Python 3.11+, FastAPI, Uvicorn, Pydantic v2                    |
| **LLM SDK**     | LiteLLM (provider-agnostic: Groq, OpenAI, Anthropic, etc.)     |
| **Database**    | SQLite with WAL mode                                            |
| **Prompts**     | Versioned YAML templates with Jinja2 rendering                  |
| **Metrics**     | Prometheus (counters, histograms, gauges)                       |
| **Tracing**     | OpenTelemetry with GenAI semantic conventions                   |
| **Testing**     | pytest + pytest-asyncio, httpx ASGITransport                    |
| **Load Test**   | k6 (JavaScript)                                                 |
| **Containers**  | Docker multi-stage build, Docker Compose                        |

---

## Features

### Core Triage
- **Single ticket triage** — paste a ticket, get instant classification
- **Bulk triage** — process multiple tickets at once with concurrent LLM calls (semaphore-limited to 5)
- **A/B prompt testing** — compare two prompt versions side by side on the same ticket
- **Expandable detail views** — click any bulk result to see full model details, cost, latency, draft reply, entities

### Classification Output
- **Priority**: critical, high, medium, low
- **Category**: billing, technical, account, shipping, cancellation, refund, product, general
- **Severity**: cosmetic, minor, major, critical
- **Confidence score**: 0.0–1.0 with visual indicators
- **Customer intent**: complaint, inquiry, cancellation, refund_request, technical_support, etc.
- **Extracted entities**: order numbers, emails, product names, dates
- **Language detection**: auto-detect non-English tickets
- **Draft reply**: AI-generated customer response
- **Recommended action**: next steps for the support agent
- **Review flag**: marks low-confidence or ambiguous tickets for human review

### Reliability
- **Circuit breaker** pattern with closed/open/half-open states for each LLM provider
- **Automatic failover** from primary to fallback model
- **Tenacity retries** with exponential backoff and jitter
- **JSON repair** — retries malformed LLM output with repair instructions
- **Input sanitization** — regex-based prompt injection protection
- **Pydantic v2 validation** on every request and response

### Observability
- **Prometheus metrics**: request count, latency histogram, token usage, cost, error rate, fallback count, schema validation
- **OpenTelemetry tracing**: distributed traces with GenAI semantic conventions
- **Real-time dashboard**: live health checks, latency charts, error distribution, token breakdown
- **Analytics page**: daily volume, category/priority/severity distributions, confidence buckets, feedback summary

### Escalation Rules
- **Rule engine**: define rules that match on priority + category
- **4 action types**: notify, escalate, assign, page on-call
- **Toggle on/off**: enable/disable rules without deleting them
- **Templates**: pre-built rule templates for common scenarios

### Data Management
- **History sidebar**: browse, search, and re-triage past tickets
- **Feedback system**: thumbs up/down on triage results for quality tracking
- **Export**: download history as CSV or JSON
- **Bulk delete**: select and delete multiple history items

### UI/UX
- **Dark/light theme**: system-aware with manual toggle
- **Responsive design**: works on desktop and mobile
- **Animations**: fade-in, stagger, smooth transitions
- **Real-time**: auto-refreshing dashboard with 5s interval

---

## Project Structure

```
oops-llm/
├── src/                          # Python backend
│   ├── api/
│   │   ├── app.py                # FastAPI app — all endpoints
│   │   └── triage.py             # TriageService — sanitization + tracing
│   ├── core/
│   │   ├── config.py             # Settings (pydantic-settings, env vars)
│   │   ├── schemas.py            # Pydantic v2 models (request/response)
│   │   └── database.py           # SQLite operations (WAL mode)
│   ├── gateway/
│   │   ├── llm_gateway.py        # LiteLLM wrapper — retry, failover, parse
│   │   └── circuit_breaker.py    # Circuit breaker state machine
│   ├── observability/
│   │   ├── metrics.py            # Prometheus counters/histograms
│   │   └── tracing.py            # OpenTelemetry setup
│   ├── prompts/
│   │   └── registry.py           # Load YAML prompts, Jinja2 render, cache
│   └── eval/
│       ├── harness.py            # Golden set evaluation framework
│       └── compare.py            # Baseline comparison with thresholds
│
├── prompts/                      # Prompt templates
│   └── triage/
│       ├── v1.yaml               # Standard prompt (temp=0.0)
│       └── v2.yaml               # Chain-of-thought prompt (temp=0.2)
│
├── data/
│   └── golden_set/
│       ├── dev.jsonl             # Development evaluation set
│       └── test.jsonl            # Test evaluation set
│
├── scripts/
│   ├── run_eval.py               # CLI: run evaluation harness
│   ├── compare_eval.py           # CLI: compare eval results to baseline
│   └── load_test.js              # k6 load test script
│
├── tests/
│   └── unit/
│       ├── test_api.py           # 25 FastAPI integration tests
│       ├── test_database.py      # 28 database CRUD tests
│       ├── test_schemas.py       # Schema validation tests
│       ├── test_request_schemas.py  # 25 request validation tests
│       ├── test_sanitization.py  # 13 injection protection tests
│       ├── test_eval_harness.py  # 11 eval framework tests
│       ├── test_prompt_registry.py  # Prompt loading tests
│       └── test_circuit_breaker.py  # Circuit breaker tests
│
├── ui/                           # React frontend
│   ├── src/
│   │   ├── App.jsx               # Router + ThemeContext
│   │   ├── main.jsx              # React entry point
│   │   ├── index.css             # Tailwind + dark/light theme overrides
│   │   ├── lib/
│   │   │   └── api.js            # API client functions
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigation + mobile menu
│   │   │   ├── StatusBadge.jsx   # Color-coded priority/category badges
│   │   │   └── StatCard.jsx      # Dashboard metric card
│   │   └── pages/
│   │       ├── TriageDemo.jsx    # Single + bulk triage with drilldown
│   │       ├── Dashboard.jsx     # Operations monitoring dashboard
│   │       ├── Analytics.jsx     # Deep analytics + charts
│   │       ├── Rules.jsx         # Escalation rule management
│   │       └── ABTest.jsx        # A/B prompt comparison
│   ├── vite.config.js            # Vite config with API proxy
│   └── package.json
│
├── docker-compose.yml            # Full stack: app + prometheus + grafana + otel
├── Dockerfile                    # Multi-stage Python 3.11-slim build
├── Makefile                      # Dev, test, eval, lint, docker commands
├── pyproject.toml                # Python deps + pytest config
├── .env.example                  # Environment variable template
├── BRIEF.md                      # Project brief + milestones
└── RUNBOOK.md                    # Operational runbook for alerts
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An LLM API key (Groq, OpenAI, or Anthropic)

### 1. Clone and Install

```bash
git clone https://github.com/druvanreddy/llm-ops.git
cd llm-ops

# Python backend
python -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# React frontend
cd ui
npm install
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API key and model:

```env
# LLM Provider — use any LiteLLM-compatible provider
GROQ_API_KEY=gsk_your_key_here
PRIMARY_MODEL=groq/openai/gpt-oss-120b
FALLBACK_MODEL=groq/qwen/qwen3.8-27b

# Or use OpenAI
# OPENAI_API_KEY=sk-your-key
# PRIMARY_MODEL=gpt-4o
# FALLBACK_MODEL=gpt-4o-mini

# Or Anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key
# PRIMARY_MODEL=claude-sonnet-4-20250514
# FALLBACK_MODEL=claude-haiku-4-20250414
```

### 3. Run

```bash
# Option A: Using Makefile
make dev

# Option B: Manual
# Terminal 1 — Backend
uvicorn src.api.app:app --reload --port 8000

# Terminal 2 — Frontend
cd ui && npm run dev
```

Open **http://localhost:3000** in your browser.

### 4. Run Tests

```bash
make test
# or
pytest tests/ -v
```

---

## Configuration

All configuration is via environment variables (loaded by pydantic-settings):

| Variable                          | Default                        | Description                                    |
| --------------------------------- | ------------------------------ | ---------------------------------------------- |
| `GROQ_API_KEY`                    | —                              | Groq API key                                   |
| `OPENAI_API_KEY`                  | —                              | OpenAI API key                                 |
| `ANTHROPIC_API_KEY`               | —                              | Anthropic API key                              |
| `PRIMARY_MODEL`                   | `groq/openai/gpt-oss-120b`    | Primary LLM model (LiteLLM format)             |
| `FALLBACK_MODEL`                  | `groq/qwen/qwen3.8-27b`       | Fallback model for circuit breaker failover    |
| `ACTIVE_PROMPT_VERSION`           | `v1`                           | Which prompt YAML to use                       |
| `MAX_INPUT_TOKENS`                | `4096`                         | Max input token limit                          |
| `LLM_TIMEOUT`                     | `30`                           | LLM request timeout (seconds)                  |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5`                          | Failures before circuit opens                  |
| `CIRCUIT_BREAKER_RECOVERY_TIMEOUT`  | `30.0`                       | Seconds before half-open retry                 |
| `APP_VERSION`                     | `0.1.0`                        | Displayed in health endpoint                   |

---

## API Reference

All endpoints are prefixed with the backend base URL (default `http://localhost:8000`).

### Health & Readiness

| Method | Endpoint    | Description                             |
| ------ | ----------- | --------------------------------------- |
| GET    | `/healthz`  | Health check — returns version, git SHA |
| GET    | `/readyz`   | Readiness — checks DB + circuit breakers|
| GET    | `/metrics`  | Prometheus metrics (text format)        |

### Triage

| Method | Endpoint              | Description                                          |
| ------ | --------------------- | ---------------------------------------------------- |
| POST   | `/api/v1/triage`      | Triage a single ticket (min 10 chars)                |
| POST   | `/api/v1/bulk-triage` | Triage multiple tickets concurrently (max 5 parallel)|
| POST   | `/api/v1/ab-test`     | Compare two prompt versions on one ticket            |

**POST /api/v1/triage** — Request:
```json
{
  "ticket_text": "I was charged twice for my subscription...",
  "client_id": "demo-ui"
}
```

Response:
```json
{
  "result": {
    "priority": "urgent",
    "category": "billing",
    "severity": "major",
    "confidence": 0.95,
    "summary": "Customer charged twice, requesting refund",
    "product": "subscription",
    "customer_intent": "refund_request",
    "detected_language": "en",
    "review_required": false,
    "extracted_entities": [{"type": "issue", "value": "double charge"}],
    "recommended_action": "Process refund and investigate billing system",
    "draft_reply": "Hi, I'm very sorry about the double charge..."
  },
  "metadata": {
    "model": "groq/openai/gpt-oss-120b",
    "provider": "groq",
    "latency_ms": 1579.0,
    "cost_usd": 0.00005,
    "input_tokens": 426,
    "output_tokens": 432,
    "prompt_version": "v1",
    "git_sha": "7725a6f",
    "fallback_used": false
  },
  "escalations": [],
  "db_id": 42
}
```

### History & Feedback

| Method | Endpoint                   | Description                        |
| ------ | -------------------------- | ---------------------------------- |
| GET    | `/api/v1/history`          | List all triage history            |
| DELETE | `/api/v1/history`          | Clear all history                  |
| POST   | `/api/v1/history/delete`   | Delete specific items by IDs       |
| POST   | `/api/v1/feedback`         | Submit feedback (up/down/null)     |

### Rules

| Method | Endpoint                      | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/v1/rules`               | List all escalation rules |
| POST   | `/api/v1/rules`               | Create a new rule         |
| DELETE | `/api/v1/rules/{id}`          | Delete a rule             |
| POST   | `/api/v1/rules/{id}/toggle`   | Toggle rule enabled state |

### Analytics & Export

| Method | Endpoint                 | Description                           |
| ------ | ------------------------ | ------------------------------------- |
| GET    | `/api/v1/stats`          | Aggregate stats (for dashboard)       |
| GET    | `/api/v1/analytics`      | Full analytics (categories, latency)  |
| GET    | `/api/v1/export/json`    | Export history as JSON                |
| GET    | `/api/v1/export/csv`     | Export history as CSV                 |

### Evaluation

| Method | Endpoint          | Description                          |
| ------ | ----------------- | ------------------------------------ |
| POST   | `/api/v1/eval`    | Run eval harness against golden set  |

---

## Frontend Pages

### Triage Demo (`/`)
The main page. Paste a support ticket and get instant AI classification. Features:
- **Single mode**: one ticket at a time with full result card (model, latency, cost, tokens, confidence bar, product area, entities, summary, draft reply, feedback)
- **Bulk mode**: paste multiple tickets (one per line, auto-numbered), process all at once, click any result to drill down into full details
- **Example tickets**: 10 pre-built examples — click to use (appends in bulk mode)
- **History sidebar**: browse past triage results, click to re-view, select to delete
- **Export**: download history as CSV or JSON

### Dashboard (`/dashboard`)
Real-time operations monitoring:
- Service health & readiness status with live indicators
- Auto-refresh every 5 seconds (toggleable)
- Key metrics: total requests, errors, cost, tokens, fallbacks, schema validity
- Charts: latency over time (area), requests by model (bar), error distribution (pie), token usage, request status

### Analytics (`/analytics`)
Deep dive into triage performance:
- KPIs: P50/P95 latency, cost per ticket, accuracy (from feedback)
- Daily volume trend
- Category, priority, severity, customer intent distributions
- Confidence score distribution (high/medium/low buckets)
- Language breakdown
- Feedback summary (thumbs up vs down)

### Rules (`/rules`)
Escalation rule management:
- Create rules matching on priority + category
- 4 action types: notify, escalate, assign, page on-call
- Quick-start templates for common scenarios
- Toggle rules on/off, delete when done
- "How it works" guide with step-by-step explanation

### A/B Test (`/ab-test`)
Compare prompt versions head-to-head:
- Send the same ticket to two different prompt versions (v1 standard vs v2 chain-of-thought)
- Side-by-side result comparison
- Quick comparison hints: which version has higher confidence, is faster, or cheaper
- Sample tickets for quick testing

---

## Prompt Engineering

Prompts are versioned YAML files in `prompts/triage/`:

### v1 — Standard (Temperature 0.0)
Direct classification prompt. Fast, deterministic, cost-effective. Best for straightforward tickets.

### v2 — Chain-of-Thought (Temperature 0.2)
Step-by-step reasoning prompt. More accurate on complex/ambiguous tickets, but uses more tokens and is slightly slower.

### YAML Structure

```yaml
version: "v1"
model: "groq/openai/gpt-oss-120b"
temperature: 0.0
system_template: |
  You are a support ticket triage AI...
  Classify the ticket and return JSON with:
  - priority, category, severity, confidence
  - summary, product, draft_reply
  - customer_intent, extracted_entities
  ...
user_template: |
  {{ ticket_text }}
```

Templates use **Jinja2** for variable substitution. The prompt registry loads, caches, and renders them at runtime.

---

## Evaluation Framework

The eval harness tests prompt quality against a golden set of labeled examples.

### Golden Set

Located in `data/golden_set/`:
- `dev.jsonl` — development set for iterating on prompts
- `test.jsonl` — held-out test set for final evaluation

Each line is a JSON object:
```json
{
  "ticket_text": "I was charged twice...",
  "expected": {"category": "billing", "priority": "high", "severity": "major"},
  "id": "billing_001"
}
```

### Running Evaluations

```bash
# Run eval via CLI
python scripts/run_eval.py --split test

# Run via API
curl -X POST http://localhost:8000/api/v1/eval?split=test

# Compare against baseline
python scripts/compare_eval.py --baseline results/baseline.json --current results/latest.json
```

### Eval Metrics
- **Accuracy by field**: exact match rate for category, priority, severity, customer_intent
- **Overall accuracy**: average across all fields
- **Schema valid rate**: percentage of responses that parsed correctly
- **Latency percentiles**: P50, P95, P99
- **Cost**: per-request and per-1K-success
- **Error rate**: by error class

---

## Observability

### Prometheus Metrics

Available at `GET /metrics`:

| Metric                      | Type      | Description                    |
| --------------------------- | --------- | ------------------------------ |
| `llm_requests_total`        | Counter   | Total triage requests          |
| `llm_errors_total`          | Counter   | Failed requests by error class |
| `llm_latency_seconds`       | Histogram | Request latency                |
| `llm_tokens_total`          | Counter   | Token usage (input/output)     |
| `llm_cost_dollars_total`    | Counter   | Estimated cost in USD          |
| `llm_fallback_total`        | Counter   | Fallback model activations     |
| `llm_schema_valid_total`    | Counter   | Schema-valid responses         |

### OpenTelemetry Tracing

Spans follow GenAI semantic conventions:
- `triage.request` — full request lifecycle
- `llm.completion` — LLM API call
- `input.sanitization` — injection check

Configure the OTel collector endpoint in `docker-compose.yml`.

### Grafana Dashboards

The Docker Compose stack includes Grafana pre-configured to scrape Prometheus. Access at `http://localhost:3001`.

---

## Reliability Patterns

### Circuit Breaker

Each LLM provider (primary + fallback) has its own circuit breaker:

```
CLOSED (normal) ──[N failures]──▶ OPEN (reject all)
       ▲                              │
       │                    [recovery timeout]
       │                              ▼
       └────[success]──── HALF_OPEN (test one request)
                              │
                          [failure] ──▶ OPEN
```

- **Failure threshold**: 5 consecutive failures opens the circuit
- **Recovery timeout**: 30 seconds before testing a single request
- **Thread-safe**: uses `threading.Lock` for concurrent access

### Retry Strategy

Tenacity retries with exponential backoff + jitter:
- Max 3 attempts
- Wait: 1–4 seconds with random jitter
- Retries on: timeout, rate limit, server error
- Does NOT retry on: auth error, invalid input

### Failover Flow

```
Request → Primary Model
            │
        [success] → Return
            │
        [failure] → Increment circuit breaker
            │
        [circuit open?]
            │ yes
            ▼
        Fallback Model
            │
        [success] → Return (with fallback_used=true)
            │
        [failure] → Return error
```

---

## Testing

### Test Suite — 124 Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/unit/test_api.py -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

| Test File                    | Tests | Coverage Area                           |
| ---------------------------- | ----- | --------------------------------------- |
| `test_api.py`                | 25    | FastAPI endpoints (health, history, rules, export, triage validation) |
| `test_database.py`           | 28    | SQLite CRUD, analytics queries, export  |
| `test_request_schemas.py`    | 25    | Pydantic request validation             |
| `test_schemas.py`            | —     | Response schema validation              |
| `test_sanitization.py`       | 13    | Prompt injection protection             |
| `test_eval_harness.py`       | 11    | Golden set loading, percentile calc     |
| `test_prompt_registry.py`    | —     | YAML loading, Jinja2 rendering          |
| `test_circuit_breaker.py`    | —     | State transitions, thread safety        |

Tests use:
- `pytest-asyncio` with `asyncio_mode = "auto"`
- `httpx.ASGITransport` for in-process API testing (no server needed)
- `unittest.mock` for isolating LLM calls
- `tmp_path` fixtures for isolated SQLite databases

---

## Deployment

### Docker

```bash
# Build
docker build -t llm-ops .

# Run
docker run -p 8000:8000 --env-file .env llm-ops
```

### Docker Compose (Full Stack)

```bash
docker-compose up -d
```

Services:
- **app** (port 8000) — FastAPI backend + static frontend
- **prometheus** (port 9090) — metrics collection
- **grafana** (port 3001) — dashboards
- **otel-collector** (port 4317) — trace collection
- **langfuse** — LLM observability platform

### Production Checklist

- [ ] Set all API keys in `.env` (never commit `.env`)
- [ ] Configure `APP_VERSION` and `GIT_SHA` for traceability
- [ ] Set up Prometheus alerting rules (see `RUNBOOK.md`)
- [ ] Configure CORS for your domain (currently allows `localhost:3000`)
- [ ] Enable HTTPS termination at your load balancer
- [ ] Set up log aggregation (stdout is structured JSON)
- [ ] Run eval harness against golden set before deploying prompt changes

---

## Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load_test.js
```

The load test script ramps up virtual users and sends triage requests to measure throughput, latency percentiles, and error rates under load.

---

## License

Private repository. All rights reserved.
