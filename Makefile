PYTHON ?= python3
API_DIR := services/api

.PHONY: api-install api-test api-cov api-lint api-format api-typecheck api-run web-serve pitch-serve \
	docker-build docker-up docker-down nexus-start nexus-stop nexus-status nexus-logs \
	mirror-verify validation-evidence

api-install:
	cd $(API_DIR) && $(PYTHON) -m pip install -e .[dev]

api-test:
	cd $(API_DIR) && $(PYTHON) -m pytest -q

api-cov:
	cd $(API_DIR) && $(PYTHON) -m pytest --cov --cov-report=term-missing

api-lint:
	cd $(API_DIR) && $(PYTHON) -m ruff check .

api-format:
	cd $(API_DIR) && $(PYTHON) -m ruff format .

api-typecheck:
	cd $(API_DIR) && $(PYTHON) -m mypy

api-run:
	cd $(API_DIR) && $(PYTHON) -m uvicorn tothemoon_api.main:app --app-dir src --host 127.0.0.1 --port 8010 --reload

web-serve:
	$(PYTHON) -m http.server 4173 --directory apps/web

pitch-serve:
	$(PYTHON) -m http.server 4174 --directory apps/pitch

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

nexus-start:
	./scripts/run-nexus-local.sh start

nexus-stop:
	./scripts/run-nexus-local.sh stop

nexus-status:
	./scripts/run-nexus-local.sh status

nexus-logs:
	./scripts/run-nexus-local.sh logs

mirror-verify:
	./scripts/verify_mirror.sh main $$(git rev-parse --abbrev-ref HEAD)

validation-evidence:
	$(PYTHON) ./scripts/collect_validation_evidence.py --task GH-6
