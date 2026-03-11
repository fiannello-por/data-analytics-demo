#!/usr/bin/env bash
# Validate chart → model field references offline (no server needed).
# Catches missing explores and broken field IDs before expensive CI steps.
#
# Usage: bash scripts/validate-lightdash-refs.sh

set -euo pipefail

MODELS_DIR="lightdash/models"
CHARTS_DIR="lightdash/charts"
errors=0

# Time-interval suffixes generated at runtime by Lightdash
TIME_SUFFIXES="_day|_week|_month|_quarter|_year"

# --- Collect model names and their files ---
model_names=""
for model_file in "$MODELS_DIR"/*.yml; do
  name=$(grep -m1 '^name:' "$model_file" | awk '{print $2}')
  [ -n "$name" ] && model_names="$model_names $name"
done

echo "Found models:$model_names"
echo ""

# --- Validate each metric-query chart ---
for chart in "$CHARTS_DIR"/*.yml; do
  # Skip SQL runner charts (they define their own queries, no explore reference)
  [[ "$chart" == *.sql.yml ]] && continue

  explore=$(grep -m1 'exploreName:' "$chart" 2>/dev/null | awk '{print $2}' || true)
  [ -z "$explore" ] && continue

  chart_name=$(basename "$chart")

  # Check exploreName has a matching model
  if ! echo "$model_names" | tr ' ' '\n' | grep -qx "$explore"; then
    echo "ERROR: $chart_name → explore '$explore' has no matching model"
    errors=$((errors + 1))
    continue
  fi

  model_file="$MODELS_DIR/${explore}.yml"
  if [ ! -f "$model_file" ]; then
    echo "ERROR: $chart_name → model file '$model_file' not found"
    errors=$((errors + 1))
    continue
  fi

  # Collect dimension names (list items: "  - name: X")
  dim_names=$(grep -E '^\s+- name:' "$model_file" | awk '{print $3}')

  # Collect metric names (map keys at 2-space indent under metrics:)
  metric_names=$(awk '/^metrics:/{found=1; next} found && /^[^ ]/{found=0} found && /^  [a-zA-Z_]/ {gsub(/:.*/, ""); gsub(/^ +/, ""); print}' "$model_file")

  all_fields=$(printf '%s\n%s' "$dim_names" "$metric_names" | grep -v '^$' | sort -u)

  # Extract field IDs from chart (pattern: explore_fieldname)
  field_ids=$(grep -oE "${explore}_[a-zA-Z0-9_]+" "$chart" | sort -u)

  for fid in $field_ids; do
    field_name="${fid#${explore}_}"

    # Skip if field exists directly
    if echo "$all_fields" | grep -qx "$field_name"; then
      continue
    fi

    # Strip time-interval suffix and check base field
    base_name=$(echo "$field_name" | sed -E "s/(${TIME_SUFFIXES})$//")
    if [ "$base_name" != "$field_name" ] && echo "$all_fields" | grep -qx "$base_name"; then
      continue
    fi

    echo "ERROR: $chart_name → field '${explore}_${field_name}' not found in model ($model_file)"
    errors=$((errors + 1))
  done
done

echo ""
if [ "$errors" -gt 0 ]; then
  echo "FAILED: $errors reference error(s) found"
  exit 1
fi
echo "OK: All chart → model references valid"
