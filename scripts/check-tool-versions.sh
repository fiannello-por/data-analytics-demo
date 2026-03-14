#!/usr/bin/env bash
# Verify local tool versions match the repo's version files.
# Usage: bash scripts/check-tool-versions.sh  (or: pnpm check:versions)

set -euo pipefail

errors=0

# --- Node.js ---
expected_node=$(cat .nvmrc)
if command -v node &>/dev/null; then
  actual_node=$(node --version | sed 's/^v//' | cut -d. -f1)
  if [ "$actual_node" != "$expected_node" ]; then
    echo "✗ Node.js: expected major ${expected_node}, got ${actual_node}"
    errors=$((errors + 1))
  else
    echo "✓ Node.js: major ${actual_node}"
  fi
else
  echo "✗ Node.js: not installed (expected major ${expected_node})"
  errors=$((errors + 1))
fi

# --- pnpm ---
if command -v node &>/dev/null; then
  expected_pnpm=$(node -e "console.log(require('./package.json').packageManager.split('@')[1])")
else
  expected_pnpm=$(sed -n 's/.*"packageManager".*"pnpm@\([^"]*\)".*/\1/p' package.json)
fi
actual_pnpm=$(pnpm --version 2>/dev/null || echo "not installed")
if [ "$actual_pnpm" != "$expected_pnpm" ]; then
  echo "✗ pnpm: expected ${expected_pnpm}, got ${actual_pnpm}"
  errors=$((errors + 1))
else
  echo "✓ pnpm: ${actual_pnpm}"
fi

# --- Python ---
if [ -f .python-version ]; then
  expected_python=$(cat .python-version)
  if command -v python3 &>/dev/null; then
    actual_python=$(python3 --version | awk '{print $2}')
    if [ "$actual_python" != "$expected_python" ]; then
      echo "✗ Python: expected ${expected_python}, got ${actual_python}"
      errors=$((errors + 1))
    else
      echo "✓ Python: ${actual_python}"
    fi
  else
    echo "✗ Python: not installed (expected ${expected_python})"
    errors=$((errors + 1))
  fi
else
  echo "- Python: no .python-version file (skipped)"
fi

# --- Lightdash CLI ---
expected_lightdash=$(cat .lightdash-version)
actual_lightdash=$(lightdash --version 2>/dev/null | awk '{print $NF}' || echo "not installed")
if [ "$actual_lightdash" = "not installed" ]; then
  echo "- Lightdash CLI: not installed (expected ${expected_lightdash})"
elif [ "$actual_lightdash" != "$expected_lightdash" ]; then
  echo "✗ Lightdash CLI: expected ${expected_lightdash}, got ${actual_lightdash}"
  errors=$((errors + 1))
else
  echo "✓ Lightdash CLI: ${actual_lightdash}"
fi

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "${errors} version mismatch(es) found."
  exit 1
fi
