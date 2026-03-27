"""Validate shared folder structure and cross-references for Lightdash content.

Enforces rules from docs/shared-folder-validation.md to ensure the Shared Folder
stays organized and dashboards only reference shared charts.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

# --- Configuration ---

_PROJECT_SLUG = "point-of-rental-revops-analytics-demo"
_SHARED_FOLDER_SLUG = "revenue"
_ALLOWED_SUBFOLDERS: dict[str, str] = {
    "charts": "charts-prod",
    "dashboards": "dashboards",
}

LEGACY_SPACE_SLUGS = frozenset(
    {
        "sales-dashboard",
        "shared/demo",
        # Items placed directly at the shared root before subfolders were created.
        # Remove once opportunity-rev-by-closed-date.sql.yml and sales-performance.yml
        # are moved into the correct subfolders.
        f"{_PROJECT_SLUG}/{_SHARED_FOLDER_SLUG}",
    }
)

# Derived paths
SHARED_ROOT = f"{_PROJECT_SLUG}/{_SHARED_FOLDER_SLUG}"
SHARED_CHARTS_SPACE = f"{SHARED_ROOT}/{_ALLOWED_SUBFOLDERS['charts']}"
SHARED_DASHBOARDS_SPACE = f"{SHARED_ROOT}/{_ALLOWED_SUBFOLDERS['dashboards']}"

_ALLOWED_SPACE_SLUGS = frozenset({SHARED_CHARTS_SPACE, SHARED_DASHBOARDS_SPACE})


# --- Data classes ---


@dataclass(frozen=True)
class ChartFile:
    """A parsed chart YAML file."""

    file_path: str
    slug: str
    space_slug: str


@dataclass(frozen=True)
class DashboardFile:
    """A parsed dashboard YAML file."""

    file_path: str
    slug: str
    space_slug: str
    referenced_chart_slugs: list[str]


@dataclass(frozen=True)
class ValidationError:
    """A single validation finding."""

    rule: str
    file: str
    message: str
    severity: str  # "error" or "warning"


# --- Rule descriptions ---

RULE_DESCRIPTIONS: dict[str, str] = {
    "A1": "No charts in the Dashboards folder",
    "A2": "No dashboards in the Charts folder",
    "B1": "Shared dashboards must only reference shared charts",
    "B2": "Warn on unresolvable chart references",
    "D1": "No unexpected subfolders",
    "D2": "No content directly in the Shared Folder root",
}


# --- Loading functions ---


def load_charts(charts_dir: Path) -> list[ChartFile]:
    """Parse all chart YAML files and extract slug and spaceSlug."""
    charts: list[ChartFile] = []
    for chart_path in sorted(charts_dir.glob("*.yml")):
        with open(chart_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            continue
        slug = data.get("slug", "")
        space_slug = data.get("spaceSlug", "")
        charts.append(
            ChartFile(
                file_path=chart_path.name,
                slug=str(slug),
                space_slug=str(space_slug),
            )
        )
    return charts


def load_dashboards(dashboards_dir: Path) -> list[DashboardFile]:
    """Parse all dashboard YAML files and extract slug, spaceSlug, and chart refs."""
    dashboards: list[DashboardFile] = []
    for dash_path in sorted(dashboards_dir.glob("*.yml")):
        with open(dash_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            continue

        slug = data.get("slug", "")
        space_slug = data.get("spaceSlug", "")

        # Walk tiles array and collect chartSlug from saved_chart tiles
        chart_slugs: list[str] = []
        for tile in data.get("tiles") or []:
            if not isinstance(tile, dict):
                continue
            if tile.get("type") != "saved_chart":
                continue
            props = tile.get("properties")
            if isinstance(props, dict):
                chart_slug = props.get("chartSlug")
                if chart_slug:
                    chart_slugs.append(str(chart_slug))

        dashboards.append(
            DashboardFile(
                file_path=dash_path.name,
                slug=str(slug),
                space_slug=str(space_slug),
                referenced_chart_slugs=chart_slugs,
            )
        )
    return dashboards


# --- Validation functions ---


def _is_in_shared_root(space_slug: str) -> bool:
    """Check if a space slug is under the shared root."""
    return space_slug == SHARED_ROOT or space_slug.startswith(SHARED_ROOT + "/")


def validate_content_types(
    charts: list[ChartFile],
    dashboards: list[DashboardFile],
) -> list[ValidationError]:
    """Rule A1: charts not in dashboards folder. Rule A2: dashboards not in charts folder."""
    errors: list[ValidationError] = []

    for chart in charts:
        if chart.space_slug == SHARED_DASHBOARDS_SPACE:
            errors.append(
                ValidationError(
                    rule="A1",
                    file=chart.file_path,
                    message="Chart found in shared dashboards folder",
                    severity="error",
                )
            )

    for dash in dashboards:
        if dash.space_slug == SHARED_CHARTS_SPACE:
            errors.append(
                ValidationError(
                    rule="A2",
                    file=dash.file_path,
                    message="Dashboard found in shared charts folder",
                    severity="error",
                )
            )

    return errors


def validate_cross_references(
    dashboards: list[DashboardFile],
    charts_by_slug: dict[str, ChartFile],
) -> list[ValidationError]:
    """Rule B1: shared dashboard chart refs must be in shared charts space.

    Rule B2: warn on unresolvable chart references.
    """
    errors: list[ValidationError] = []

    for dash in dashboards:
        # Only check dashboards in the shared dashboards space
        if dash.space_slug != SHARED_DASHBOARDS_SPACE:
            continue

        for chart_slug in dash.referenced_chart_slugs:
            chart = charts_by_slug.get(chart_slug)
            if chart is None:
                errors.append(
                    ValidationError(
                        rule="B2",
                        file=dash.file_path,
                        message=(
                            f"References chart '{chart_slug}' which was not found "
                            f"in any chart YAML file"
                        ),
                        severity="warning",
                    )
                )
            elif chart.space_slug != SHARED_CHARTS_SPACE:
                errors.append(
                    ValidationError(
                        rule="B1",
                        file=dash.file_path,
                        message=(
                            f"References chart '{chart_slug}' which lives in "
                            f"'{chart.space_slug}', not in the shared charts folder"
                        ),
                        severity="error",
                    )
                )

    return errors


def validate_folder_structure(
    charts: list[ChartFile],
    dashboards: list[DashboardFile],
) -> list[ValidationError]:
    """Rule D1: no unexpected subfolders. Rule D2: no content at shared root."""
    errors: list[ValidationError] = []

    all_items: list[tuple[str, str]] = []
    for c in charts:
        all_items.append((c.file_path, c.space_slug))
    for d in dashboards:
        all_items.append((d.file_path, d.space_slug))

    for file_path, space_slug in all_items:
        if not _is_in_shared_root(space_slug):
            continue

        if space_slug == SHARED_ROOT:
            errors.append(
                ValidationError(
                    rule="D2",
                    file=file_path,
                    message="Content placed directly in shared folder root",
                    severity="error",
                )
            )
        elif space_slug not in _ALLOWED_SPACE_SLUGS:
            errors.append(
                ValidationError(
                    rule="D1",
                    file=file_path,
                    message=(f"Content in unexpected subfolder '{space_slug}' under shared root"),
                    severity="error",
                )
            )

    return errors


def validate_all(
    charts: list[ChartFile],
    dashboards: list[DashboardFile],
) -> list[ValidationError]:
    """Run all validation rules on the provided charts and dashboards.

    Items in legacy space slugs are excluded before validation.
    """
    # Filter out legacy items
    filtered_charts = [c for c in charts if c.space_slug not in LEGACY_SPACE_SLUGS]
    filtered_dashboards = [d for d in dashboards if d.space_slug not in LEGACY_SPACE_SLUGS]

    # Build chart lookup (use ALL charts for cross-ref resolution, not just filtered)
    charts_by_slug: dict[str, ChartFile] = {c.slug: c for c in charts}

    all_errors: list[ValidationError] = []
    all_errors.extend(validate_content_types(filtered_charts, filtered_dashboards))
    all_errors.extend(validate_cross_references(filtered_dashboards, charts_by_slug))
    all_errors.extend(validate_folder_structure(filtered_charts, filtered_dashboards))

    return all_errors


def main() -> None:
    """CLI entry point for validate-shared."""
    project_root = Path.cwd()
    charts_dir = project_root / "semantic" / "lightdash" / "charts"
    dashboards_dir = project_root / "semantic" / "lightdash" / "dashboards"

    if not charts_dir.is_dir():
        print(f"ERROR: Charts directory not found: {charts_dir}", file=sys.stderr)
        sys.exit(1)

    if not dashboards_dir.is_dir():
        print(f"ERROR: Dashboards directory not found: {dashboards_dir}", file=sys.stderr)
        sys.exit(1)

    charts = load_charts(charts_dir)
    dashboards = load_dashboards(dashboards_dir)

    print(f"Loaded {len(charts)} charts and {len(dashboards)} dashboards")
    print()

    errors = validate_all(charts, dashboards)

    if not errors:
        print("OK: All shared folder rules pass")
        sys.exit(0)

    # Group by rule
    error_count = sum(1 for e in errors if e.severity == "error")
    warning_count = sum(1 for e in errors if e.severity == "warning")

    rules_seen: dict[str, list[ValidationError]] = {}
    for err in errors:
        rules_seen.setdefault(err.rule, []).append(err)

    for rule in sorted(rules_seen.keys()):
        description = RULE_DESCRIPTIONS.get(rule, "")
        print(f"\u2500\u2500 Rule {rule}: {description} \u2500\u2500")
        for err in rules_seen[rule]:
            label = err.severity.upper()
            print(f"  {label}: {err.file} \u2192 {err.message}")
        print()

    print(f"FAILED: {error_count} error(s), {warning_count} warning(s)")
    sys.exit(1 if error_count > 0 else 0)


if __name__ == "__main__":
    main()
