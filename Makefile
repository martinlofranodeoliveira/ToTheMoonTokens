PYTHON ?= python3
API_DIR := services/api

.PHONY: api-install api-test api-run web-serve

api-install:
	cd $(API_DIR) && $(PYTHON) -m pip install -e .[dev]

api-test:
	cd $(API_DIR) && $(PYTHON) -m pytest -q

api-run:
	cd $(API_DIR) && $(PYTHON) -m uvicorn tothemoon_api.main:app --app-dir src --host 127.0.0.1 --port 8010 --reload

web-serve:
	$(PYTHON) -m http.server 4173 --directory apps/web

