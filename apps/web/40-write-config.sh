#!/bin/sh
set -eu

escaped_url="$(printf '%s' "${TTM_API_BASE_URL:-}" | sed 's/[\\"]/\\&/g')"
printf 'window.TTM_API_BASE_URL = "%s";\n' "$escaped_url" > /usr/share/nginx/html/config.js
