PYTHON ?= python3
NPM ?= npm
API_DIR := services/api
WEB_NEXT_DIR := apps/web-next
VENV_DIR ?= .venv
VENV_PYTHON := $(abspath $(VENV_DIR))/bin/python

.PHONY: api-install api-test api-cov api-lint api-format api-typecheck api-run web-serve pitch-serve \
	api-venv api-install-venv api-compile api-lint-venv api-test-venv api-baseline \
	web-next-install web-next-build web-next-e2e baseline-check clean-generated generated-artifacts-check \
	demo-start demo-stop demo-status demo-logs \
	docker-build docker-up docker-down nexus-start nexus-stop nexus-status nexus-logs \
	mirror-verify validation-evidence ci-evidence vm-deploy-ci-evidence

GENERATED_DIRS := \
	.pytest_cache \
	.mypy_cache \
	.ruff_cache \
	services/api/.pytest_cache \
	services/api/.mypy_cache \
	services/api/.ruff_cache \
	apps/web-next/dist \
	apps/web-next/playwright-report \
	apps/web-next/test-results

api-venv:
	$(PYTHON) -m venv $(VENV_DIR)

api-install-venv: api-venv
	cd $(API_DIR) && $(VENV_PYTHON) -m pip install -e .[dev]

api-compile:
	cd $(API_DIR) && $(PYTHON) -m compileall -q src tests

api-lint-venv: api-install-venv
	cd $(API_DIR) && $(VENV_PYTHON) -m ruff check .

api-test-venv:
	tmp_db=$$(mktemp -t ttm-api-test.XXXXXX.db); \
	rm -f $$tmp_db; \
	cd $(API_DIR) && DATABASE_URL=sqlite:///$$tmp_db ALLOW_IMPORT_TIME_INIT_DB=true $(VENV_PYTHON) -m pytest -q; \
	status=$$?; \
	rm -f $$tmp_db $$tmp_db-shm $$tmp_db-wal; \
	exit $$status

api-baseline: api-install-venv api-test-venv

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

web-next-install:
	cd $(WEB_NEXT_DIR) && NODE_ENV= $(NPM) ci --include=dev

web-next-build: web-next-install
	cd $(WEB_NEXT_DIR) && $(NPM) run build

web-next-e2e: web-next-install
	cd $(WEB_NEXT_DIR) && npx playwright install chromium && $(NPM) run test:e2e

baseline-check: api-baseline web-next-build

clean-generated:
	rm -rf $(GENERATED_DIRS)
	find . -path './.git' -prune -o -path './.venv' -prune -o -path './apps/web-next/node_modules' -prune -o -type d -name '__pycache__' -prune -exec rm -rf {} +
	find . -path './.git' -prune -o -path './.venv' -prune -o -path './apps/web-next/node_modules' -prune -o -type f \( -name '*.pyc' -o -name '*.pyo' -o -name '*.tsbuildinfo' \) -exec rm -f {} +

generated-artifacts-check:
	@tracked="$$(git ls-files | grep -E '(^|/)(__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|node_modules|dist|coverage|playwright-report|test-results)(/|$$)|\.(pyc|pyo|tsbuildinfo)$$' || true)"; \
	unignored="$$(git ls-files --others --exclude-standard | grep -E '(^|/)(__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|node_modules|dist|coverage|playwright-report|test-results)(/|$$)|\.(pyc|pyo|tsbuildinfo)$$' || true)"; \
	if [ -n "$$tracked$$unignored" ]; then \
		echo 'Generated artifacts are tracked or not ignored:'; \
		printf '%s\n' "$$tracked" "$$unignored" | sed '/^$$/d'; \
		echo 'Run make clean-generated and update .gitignore if a new generated path appears.'; \
		exit 1; \
	fi; \
	echo 'No tracked or unignored generated artifacts found.'

web-serve:
	$(PYTHON) -m http.server 4173 --directory apps/web

pitch-serve:
	$(PYTHON) -m http.server 4174 --directory apps/pitch

demo-start:
	./scripts/run-local-demo.sh start

demo-stop:
	./scripts/run-local-demo.sh stop

demo-status:
	./scripts/run-local-demo.sh status

demo-logs:
	./scripts/run-local-demo.sh logs

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

ci-evidence:
	$(PYTHON) ./scripts/collect_ci_evidence.py

vm-deploy-ci-evidence:
	$(PYTHON) ./scripts/collect_vm_deploy_ci_evidence.py
