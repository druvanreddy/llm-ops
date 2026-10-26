.PHONY: dev test eval eval-compare lint type-check docker-up docker-down clean

# === Development ===
dev:
	uvicorn src.api.app:app --reload --port 8000

install:
	pip install -e ".[dev]"

# === Testing ===
test:
	pytest tests/ -v --tb=short

test-cov:
	pytest tests/ -v --tb=short --cov=src --cov-report=html --cov-report=term

# === Evaluation ===
eval:
	python -m scripts.run_eval --split test --output results/current.json

eval-dev:
	python -m scripts.run_eval --split dev --output results/dev.json

eval-compare:
	python -m scripts.compare_eval --baseline results/baseline.json --current results/current.json

eval-baseline:
	python -m scripts.run_eval --split test --output results/baseline.json

# === Code Quality ===
lint:
	ruff check src/ tests/ scripts/
	ruff format --check src/ tests/ scripts/

lint-fix:
	ruff check --fix src/ tests/ scripts/
	ruff format src/ tests/ scripts/

type-check:
	mypy src/

# === Docker ===
docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f app

# === Load Testing ===
load-test:
	k6 run scripts/load_test.js

# === Cleanup ===
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache htmlcov .mypy_cache .ruff_cache
