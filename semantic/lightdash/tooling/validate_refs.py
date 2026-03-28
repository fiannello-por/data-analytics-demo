"""Validate chart -> model field references offline (no server needed).

Catches missing explores and broken field IDs before expensive CI steps.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

TIME_SUFFIXES = ("_day", "_week", "_month", "_quarter", "_year")


@dataclass(frozen=True)
class ModelInfo:
    """Parsed model metadata from a Lightdash model YAML file."""

    name: str
    dimensions: list[str]
    metrics: list[str]


@dataclass(frozen=True)
class ChartInfo:
    """Parsed chart metadata from a Lightdash chart YAML file."""

    file_path: str
    explore_name: str
    field_ids: list[str]


def load_model(model_path: Path) -> ModelInfo | None:
    """Parse a model YAML file and extract name, dimensions, and metrics."""
    with open(model_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        return None

    name = data.get("name")
    if not name:
        return None

    dimensions: list[str] = []
    for dim in data.get("dimensions") or []:
        if isinstance(dim, dict) and "name" in dim:
            dimensions.append(dim["name"])

    metrics: list[str] = []
    metrics_section = data.get("metrics")
    if isinstance(metrics_section, dict):
        metrics.extend(metrics_section.keys())

    return ModelInfo(name=str(name), dimensions=dimensions, metrics=metrics)


def load_chart(chart_path: Path) -> ChartInfo | None:
    """Parse a chart YAML file and extract explore name and field IDs."""
    with open(chart_path, encoding="utf-8") as f:
        content = f.read()

    data = yaml.safe_load(content)
    if not isinstance(data, dict):
        return None

    metric_query = data.get("metricQuery")
    if not isinstance(metric_query, dict):
        return None

    explore_name = metric_query.get("exploreName")
    if not explore_name:
        return None

    explore_name = str(explore_name)
    pattern = re.compile(rf"{re.escape(explore_name)}_[a-zA-Z0-9_]+")
    field_ids = sorted(set(pattern.findall(content)))

    return ChartInfo(
        file_path=chart_path.name,
        explore_name=explore_name,
        field_ids=field_ids,
    )


def validate_refs(models_dir: Path, charts_dir: Path) -> list[str]:
    """Validate all chart -> model field references."""
    errors: list[str] = []

    models: dict[str, ModelInfo] = {}
    for model_file in sorted(models_dir.glob("*.yml")):
        model = load_model(model_file)
        if model is not None:
            models[model.name] = model

    model_names = " ".join(models.keys())
    print(f"Found models: {model_names}")
    print()

    for chart_path in sorted(charts_dir.glob("*.yml")):
        if chart_path.name.endswith(".sql.yml"):
            continue

        chart = load_chart(chart_path)
        if chart is None:
            continue

        explore = chart.explore_name
        chart_name = chart.file_path

        if explore not in models:
            errors.append(f"ERROR: {chart_name} → explore '{explore}' has no matching model")
            continue

        model = models[explore]
        model_file = models_dir / f"{explore}.yml"

        if not model_file.exists():
            errors.append(f"ERROR: {chart_name} → model file '{model_file}' not found")
            continue

        all_fields = set(model.dimensions) | set(model.metrics)

        for fid in chart.field_ids:
            field_name = fid[len(explore) + 1 :]

            if field_name in all_fields:
                continue

            base_name = field_name
            for suffix in TIME_SUFFIXES:
                if field_name.endswith(suffix):
                    base_name = field_name[: -len(suffix)]
                    break

            if base_name != field_name and base_name in all_fields:
                continue

            errors.append(
                f"ERROR: {chart_name} → field '{explore}_{field_name}' "
                f"not found in model ({model_file})"
            )

    return errors


def main() -> None:
    """CLI entry point for validate-refs."""
    project_root = Path(__file__).resolve().parents[1]
    models_dir = project_root / "models"
    charts_dir = project_root / "charts"

    if not models_dir.is_dir():
        print(f"ERROR: Models directory not found: {models_dir}", file=sys.stderr)
        sys.exit(1)

    if not charts_dir.is_dir():
        print(f"ERROR: Charts directory not found: {charts_dir}", file=sys.stderr)
        sys.exit(1)

    errors = validate_refs(models_dir, charts_dir)

    print()
    if errors:
        for err in errors:
            print(err)
        print()
        print(f"FAILED: {len(errors)} reference error(s) found")
        sys.exit(1)

    print("OK: All chart → model references valid")


if __name__ == "__main__":
    main()
