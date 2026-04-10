#!/usr/bin/env bash
# Publish talos-agent to PyPI (or TestPyPI).
#
# Prerequisites:
#   1. PyPI account: https://pypi.org/account/register/
#   2. API token:    https://pypi.org/manage/account/token/
#   3. Export token: export PYPI_API_TOKEN=pypi-...
#
# Usage:
#   ./scripts/publish.sh           # PyPI
#   ./scripts/publish.sh --test    # TestPyPI first

set -euo pipefail
cd "$(dirname "$0")/.."

TEST=false
if [[ "${1:-}" == "--test" ]]; then
  TEST=true
fi

if [[ -z "${PYPI_API_TOKEN:-}" ]]; then
  echo "Error: set PYPI_API_TOKEN (pypi-... API token from pypi.org/manage/account/token/)" >&2
  exit 1
fi

python3 -m pip install --quiet build twine

cp ../../LICENSE LICENSE
python3 -m build
rm -f LICENSE

if $TEST; then
  python3 -m twine upload --repository testpypi dist/*
  echo "Uploaded to TestPyPI. Install with:"
  echo "  pip install --index-url https://test.pypi.org/simple/ talos-agent"
else
  python3 -m twine upload dist/*
  echo "Uploaded to PyPI. Install with:"
  echo "  pip install talos-agent"
fi
