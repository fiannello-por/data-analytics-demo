"""Tests for the Lightdash field-reference validator."""

from __future__ import annotations

from typing import TYPE_CHECKING

import yaml

if TYPE_CHECKING:
    from pathlib import Path

from validate_refs import (
    load_chart,
    load_model,
    validate_refs,
)

# ---------------------------------------------------------------------------
# Fixtures: inline YAML data
# ---------------------------------------------------------------------------

SAMPLE_MODEL_YAML = {
    "type": "model",
    "name": "fct_sales",
    "dimensions": [
        {"name": "stage", "type": "string"},
        {"name": "opportunity_owner", "type": "string"},
        {"name": "close_date", "type": "date"},
    ],
    "metrics": {
        "total_revenue": {"type": "sum", "sql": "${TABLE}.amount"},
        "deal_count": {"type": "count_distinct", "sql": "${TABLE}.id"},
    },
}

SAMPLE_CHART_YAML = {
    "name": "Revenue by Stage",
    "metricQuery": {
        "exploreName": "fct_sales",
        "dimensions": ["fct_sales_stage"],
        "metrics": ["fct_sales_total_revenue"],
    },
    "slug": "revenue-by-stage",
    "spaceSlug": "shared/charts",
}

SQL_CHART_YAML = {
    "name": "Custom SQL Query",
    "sql": "SELECT * FROM table",
    "slug": "custom-sql",
}


# ---------------------------------------------------------------------------
# ModelInfo loading tests
# ---------------------------------------------------------------------------


class TestLoadModel:
    def test_load_valid_model(self, tmp_path: Path) -> None:
        model_file = tmp_path / "fct_sales.yml"
        model_file.write_text(yaml.dump(SAMPLE_MODEL_YAML))

        model = load_model(model_file)
        assert model is not None
        assert model.name == "fct_sales"
        assert model.dimensions == ["stage", "opportunity_owner", "close_date"]
        assert sorted(model.metrics) == ["deal_count", "total_revenue"]

    def test_load_model_no_metrics(self, tmp_path: Path) -> None:
        data = {"name": "simple_model", "dimensions": [{"name": "col_a"}]}
        model_file = tmp_path / "simple.yml"
        model_file.write_text(yaml.dump(data))

        model = load_model(model_file)
        assert model is not None
        assert model.metrics == []
        assert model.dimensions == ["col_a"]

    def test_load_model_no_name(self, tmp_path: Path) -> None:
        data = {"dimensions": [{"name": "x"}]}
        model_file = tmp_path / "bad.yml"
        model_file.write_text(yaml.dump(data))

        model = load_model(model_file)
        assert model is None

    def test_load_model_empty_file(self, tmp_path: Path) -> None:
        model_file = tmp_path / "empty.yml"
        model_file.write_text("")

        model = load_model(model_file)
        assert model is None


# ---------------------------------------------------------------------------
# ChartInfo loading tests
# ---------------------------------------------------------------------------


class TestLoadChart:
    def test_load_valid_chart(self, tmp_path: Path) -> None:
        chart_file = tmp_path / "revenue-by-stage.yml"
        chart_file.write_text(yaml.dump(SAMPLE_CHART_YAML))

        chart = load_chart(chart_file)
        assert chart is not None
        assert chart.explore_name == "fct_sales"
        assert chart.file_path == "revenue-by-stage.yml"
        assert "fct_sales_stage" in chart.field_ids
        assert "fct_sales_total_revenue" in chart.field_ids

    def test_load_chart_no_metric_query(self, tmp_path: Path) -> None:
        data = {"name": "No Query", "slug": "no-query"}
        chart_file = tmp_path / "no-query.yml"
        chart_file.write_text(yaml.dump(data))

        chart = load_chart(chart_file)
        assert chart is None

    def test_load_chart_no_explore_name(self, tmp_path: Path) -> None:
        data = {"name": "Bad Chart", "metricQuery": {"dimensions": []}}
        chart_file = tmp_path / "bad.yml"
        chart_file.write_text(yaml.dump(data))

        chart = load_chart(chart_file)
        assert chart is None


# ---------------------------------------------------------------------------
# Field matching with time suffixes
# ---------------------------------------------------------------------------


class TestFieldMatchingWithTimeSuffixes:
    def test_direct_field_match(self, tmp_path: Path) -> None:
        """A field that matches a dimension directly should pass."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "orders",
            "dimensions": [{"name": "status"}, {"name": "created_at"}],
            "metrics": {"total_amount": {"type": "sum"}},
        }
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Test Chart",
            "metricQuery": {
                "exploreName": "orders",
                "dimensions": ["orders_status"],
                "metrics": ["orders_total_amount"],
            },
            "slug": "test",
        }
        (charts_dir / "test.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_time_suffix_day(self, tmp_path: Path) -> None:
        """Fields with _day suffix should resolve to the base date field."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "orders",
            "dimensions": [{"name": "created_at"}],
            "metrics": {},
        }
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Test Chart",
            "metricQuery": {
                "exploreName": "orders",
                "dimensions": ["orders_created_at_day"],
            },
            "slug": "test",
        }
        (charts_dir / "test.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_time_suffix_month(self, tmp_path: Path) -> None:
        """Fields with _month suffix should resolve to the base date field."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "events",
            "dimensions": [{"name": "event_date"}],
            "metrics": {},
        }
        (models_dir / "events.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Monthly Events",
            "metricQuery": {
                "exploreName": "events",
                "dimensions": ["events_event_date_month"],
            },
            "slug": "monthly",
        }
        (charts_dir / "monthly.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_time_suffix_quarter(self, tmp_path: Path) -> None:
        """Fields with _quarter suffix should resolve."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "sales",
            "dimensions": [{"name": "close_date"}],
            "metrics": {},
        }
        (models_dir / "sales.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Q Chart",
            "metricQuery": {
                "exploreName": "sales",
                "dimensions": ["sales_close_date_quarter"],
            },
            "slug": "q-chart",
        }
        (charts_dir / "q-chart.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_time_suffix_year(self, tmp_path: Path) -> None:
        """Fields with _year suffix should resolve."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "sales",
            "dimensions": [{"name": "close_date"}],
            "metrics": {},
        }
        (models_dir / "sales.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Yearly",
            "metricQuery": {
                "exploreName": "sales",
                "dimensions": ["sales_close_date_year"],
            },
            "slug": "yearly",
        }
        (charts_dir / "yearly.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_time_suffix_week(self, tmp_path: Path) -> None:
        """Fields with _week suffix should resolve."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "sales",
            "dimensions": [{"name": "close_date"}],
            "metrics": {},
        }
        (models_dir / "sales.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Weekly",
            "metricQuery": {
                "exploreName": "sales",
                "dimensions": ["sales_close_date_week"],
            },
            "slug": "weekly",
        }
        (charts_dir / "weekly.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_unknown_suffix_fails(self, tmp_path: Path) -> None:
        """A field with an unknown suffix should fail validation."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "orders",
            "dimensions": [{"name": "created_at"}],
            "metrics": {},
        }
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Bad Suffix",
            "metricQuery": {
                "exploreName": "orders",
                "dimensions": ["orders_created_at_fortnight"],
            },
            "slug": "bad",
        }
        (charts_dir / "bad.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert len(errors) == 1
        assert "orders_created_at_fortnight" in errors[0]


# ---------------------------------------------------------------------------
# SQL chart skipping
# ---------------------------------------------------------------------------


class TestSqlChartSkipping:
    def test_sql_chart_is_skipped(self, tmp_path: Path) -> None:
        """Charts with .sql.yml extension should be skipped entirely."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {"name": "orders", "dimensions": [{"name": "id"}], "metrics": {}}
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        # SQL chart with references that would normally fail
        sql_chart = {
            "name": "SQL Chart",
            "metricQuery": {
                "exploreName": "nonexistent_model",
                "dimensions": ["nonexistent_model_bad_field"],
            },
            "slug": "sql-chart",
        }
        (charts_dir / "sql-chart.sql.yml").write_text(yaml.dump(sql_chart))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []


# ---------------------------------------------------------------------------
# Missing model detection
# ---------------------------------------------------------------------------


class TestMissingModelDetection:
    def test_missing_explore_model(self, tmp_path: Path) -> None:
        """Charts referencing a non-existent model should produce an error."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {"name": "orders", "dimensions": [{"name": "id"}], "metrics": {}}
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Bad Chart",
            "metricQuery": {
                "exploreName": "nonexistent_explore",
                "dimensions": [],
            },
            "slug": "bad",
        }
        (charts_dir / "bad.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert len(errors) == 1
        assert "nonexistent_explore" in errors[0]
        assert "no matching model" in errors[0]

    def test_missing_field_in_model(self, tmp_path: Path) -> None:
        """Fields not found in the model should produce errors."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "orders",
            "dimensions": [{"name": "status"}],
            "metrics": {"count": {"type": "count"}},
        }
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Bad Fields",
            "metricQuery": {
                "exploreName": "orders",
                "dimensions": ["orders_nonexistent_field"],
                "metrics": ["orders_bad_metric"],
            },
            "slug": "bad-fields",
        }
        (charts_dir / "bad-fields.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert len(errors) == 2
        assert any("orders_nonexistent_field" in e for e in errors)
        assert any("orders_bad_metric" in e for e in errors)


# ---------------------------------------------------------------------------
# Valid references pass
# ---------------------------------------------------------------------------


class TestValidReferencesPassing:
    def test_all_valid_refs(self, tmp_path: Path) -> None:
        """All valid field references should produce no errors."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "pipeline",
            "dimensions": [
                {"name": "stage"},
                {"name": "owner"},
                {"name": "close_date"},
            ],
            "metrics": {
                "total_amount": {"type": "sum"},
                "avg_deal": {"type": "average"},
            },
        }
        (models_dir / "pipeline.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Pipeline Chart",
            "metricQuery": {
                "exploreName": "pipeline",
                "dimensions": [
                    "pipeline_stage",
                    "pipeline_close_date_month",
                ],
                "metrics": [
                    "pipeline_total_amount",
                    "pipeline_avg_deal",
                ],
            },
            "slug": "pipeline-chart",
        }
        (charts_dir / "pipeline-chart.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_metric_field_references(self, tmp_path: Path) -> None:
        """Metric fields should be recognized as valid references."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {
            "name": "sales",
            "dimensions": [],
            "metrics": {
                "revenue": {"type": "sum"},
                "count": {"type": "count"},
            },
        }
        (models_dir / "sales.yml").write_text(yaml.dump(model_data))

        chart_data = {
            "name": "Sales KPIs",
            "metricQuery": {
                "exploreName": "sales",
                "dimensions": [],
                "metrics": ["sales_revenue", "sales_count"],
            },
            "slug": "kpis",
        }
        (charts_dir / "kpis.yml").write_text(yaml.dump(chart_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []

    def test_empty_charts_dir(self, tmp_path: Path) -> None:
        """No charts at all should produce no errors."""
        models_dir = tmp_path / "models"
        charts_dir = tmp_path / "charts"
        models_dir.mkdir()
        charts_dir.mkdir()

        model_data = {"name": "orders", "dimensions": [{"name": "id"}], "metrics": {}}
        (models_dir / "orders.yml").write_text(yaml.dump(model_data))

        errors = validate_refs(models_dir, charts_dir)
        assert errors == []
