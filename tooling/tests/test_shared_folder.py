"""Tests for the shared folder validator."""

from __future__ import annotations

from por_tooling.validators.shared_folder import (
    SHARED_CHARTS_SPACE,
    SHARED_DASHBOARDS_SPACE,
    SHARED_ROOT,
    ChartFile,
    DashboardFile,
    validate_all,
    validate_content_types,
    validate_cross_references,
    validate_folder_structure,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _chart(
    slug: str = "chart-1",
    space_slug: str = SHARED_CHARTS_SPACE,
    file_path: str = "chart-1.yml",
) -> ChartFile:
    return ChartFile(file_path=file_path, slug=slug, space_slug=space_slug)


def _dashboard(
    slug: str = "dash-1",
    space_slug: str = SHARED_DASHBOARDS_SPACE,
    file_path: str = "dash-1.yml",
    chart_slugs: list[str] | None = None,
) -> DashboardFile:
    return DashboardFile(
        file_path=file_path,
        slug=slug,
        space_slug=space_slug,
        referenced_chart_slugs=chart_slugs or [],
    )


# ---------------------------------------------------------------------------
# Rule A1: No charts in the Dashboards folder
# ---------------------------------------------------------------------------


class TestRuleA1:
    def test_chart_in_correct_folder_passes(self) -> None:
        charts = [_chart(space_slug=SHARED_CHARTS_SPACE)]
        errors = validate_content_types(charts, [])
        assert errors == []

    def test_chart_in_dashboards_folder_fails(self) -> None:
        charts = [_chart(space_slug=SHARED_DASHBOARDS_SPACE, file_path="bad-chart.yml")]
        errors = validate_content_types(charts, [])
        assert len(errors) == 1
        assert errors[0].rule == "A1"
        assert errors[0].severity == "error"
        assert errors[0].file == "bad-chart.yml"

    def test_chart_in_personal_folder_passes(self) -> None:
        charts = [_chart(space_slug="personal-folder-alice/drafts")]
        errors = validate_content_types(charts, [])
        assert errors == []


# ---------------------------------------------------------------------------
# Rule A2: No dashboards in the Charts folder
# ---------------------------------------------------------------------------


class TestRuleA2:
    def test_dashboard_in_correct_folder_passes(self) -> None:
        dashboards = [_dashboard(space_slug=SHARED_DASHBOARDS_SPACE)]
        errors = validate_content_types([], dashboards)
        assert errors == []

    def test_dashboard_in_charts_folder_fails(self) -> None:
        dashboards = [_dashboard(space_slug=SHARED_CHARTS_SPACE, file_path="bad-dash.yml")]
        errors = validate_content_types([], dashboards)
        assert len(errors) == 1
        assert errors[0].rule == "A2"
        assert errors[0].severity == "error"
        assert errors[0].file == "bad-dash.yml"

    def test_dashboard_in_personal_folder_passes(self) -> None:
        dashboards = [_dashboard(space_slug="personal-folder-bob")]
        errors = validate_content_types([], dashboards)
        assert errors == []


# ---------------------------------------------------------------------------
# Rule B1: Shared dashboards must only reference shared charts
# ---------------------------------------------------------------------------


class TestRuleB1:
    def test_shared_dashboard_with_shared_chart_passes(self) -> None:
        chart = _chart(slug="my-chart", space_slug=SHARED_CHARTS_SPACE)
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=["my-chart"],
        )
        errors = validate_cross_references([dash], {"my-chart": chart})
        assert errors == []

    def test_shared_dashboard_referencing_personal_chart_fails(self) -> None:
        chart = _chart(slug="personal-chart", space_slug="personal-folder-alice")
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=["personal-chart"],
            file_path="shared-dash.yml",
        )
        errors = validate_cross_references([dash], {"personal-chart": chart})
        b1_errors = [e for e in errors if e.rule == "B1"]
        assert len(b1_errors) == 1
        assert b1_errors[0].severity == "error"
        assert "personal-folder-alice" in b1_errors[0].message

    def test_non_shared_dashboard_with_personal_chart_passes(self) -> None:
        """Dashboards outside the shared folder are not checked by B1."""
        chart = _chart(slug="draft", space_slug="personal-folder-alice")
        dash = _dashboard(
            space_slug="personal-folder-bob",
            chart_slugs=["draft"],
        )
        errors = validate_cross_references([dash], {"draft": chart})
        assert errors == []


# ---------------------------------------------------------------------------
# Rule B2: Warn on unresolvable chart references
# ---------------------------------------------------------------------------


class TestRuleB2:
    def test_missing_chart_slug_warns(self) -> None:
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=["ghost-chart"],
            file_path="shared-dash.yml",
        )
        errors = validate_cross_references([dash], {})
        b2_errors = [e for e in errors if e.rule == "B2"]
        assert len(b2_errors) == 1
        assert b2_errors[0].severity == "warning"
        assert "ghost-chart" in b2_errors[0].message

    def test_existing_chart_slug_no_warning(self) -> None:
        chart = _chart(slug="real-chart", space_slug=SHARED_CHARTS_SPACE)
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=["real-chart"],
        )
        errors = validate_cross_references([dash], {"real-chart": chart})
        b2_errors = [e for e in errors if e.rule == "B2"]
        assert b2_errors == []


# ---------------------------------------------------------------------------
# Rule D1: No unexpected subfolders
# ---------------------------------------------------------------------------


class TestRuleD1:
    def test_allowed_subfolder_passes(self) -> None:
        charts = [_chart(space_slug=SHARED_CHARTS_SPACE)]
        dashboards = [_dashboard(space_slug=SHARED_DASHBOARDS_SPACE)]
        errors = validate_folder_structure(charts, dashboards)
        assert errors == []

    def test_unexpected_subfolder_fails(self) -> None:
        charts = [
            _chart(
                space_slug=f"{SHARED_ROOT}/secret-folder",
                file_path="rogue.yml",
            )
        ]
        errors = validate_folder_structure(charts, [])
        d1_errors = [e for e in errors if e.rule == "D1"]
        assert len(d1_errors) == 1
        assert d1_errors[0].severity == "error"
        assert "unexpected subfolder" in d1_errors[0].message

    def test_content_outside_shared_root_passes(self) -> None:
        charts = [_chart(space_slug="completely-other-space")]
        errors = validate_folder_structure(charts, [])
        assert errors == []


# ---------------------------------------------------------------------------
# Rule D2: No content directly in the Shared Folder root
# ---------------------------------------------------------------------------


class TestRuleD2:
    def test_content_at_shared_root_fails(self) -> None:
        charts = [_chart(space_slug=SHARED_ROOT, file_path="root-chart.yml")]
        errors = validate_folder_structure(charts, [])
        d2_errors = [e for e in errors if e.rule == "D2"]
        assert len(d2_errors) == 1
        assert d2_errors[0].severity == "error"
        assert "root" in d2_errors[0].message.lower()

    def test_content_in_subfolder_passes(self) -> None:
        charts = [_chart(space_slug=SHARED_CHARTS_SPACE)]
        errors = validate_folder_structure(charts, [])
        d2_errors = [e for e in errors if e.rule == "D2"]
        assert d2_errors == []


# ---------------------------------------------------------------------------
# Legacy space slug exclusion
# ---------------------------------------------------------------------------


class TestLegacySpaceExclusion:
    def test_legacy_chart_excluded_from_validation(self) -> None:
        """Charts in legacy spaces should be excluded from all rules."""
        chart = _chart(
            slug="legacy-chart",
            space_slug="sales-dashboard",
            file_path="legacy.yml",
        )
        errors = validate_all([chart], [])
        assert errors == []

    def test_legacy_dashboard_excluded(self) -> None:
        """Dashboards in legacy spaces should be excluded."""
        dash = _dashboard(
            slug="legacy-dash",
            space_slug="shared/demo",
            chart_slugs=["nonexistent-chart"],
            file_path="legacy-dash.yml",
        )
        errors = validate_all([], [dash])
        assert errors == []

    def test_non_legacy_item_still_validated(self) -> None:
        """Items not in legacy spaces should still be validated."""
        chart = _chart(
            slug="bad-chart",
            space_slug=SHARED_DASHBOARDS_SPACE,
            file_path="bad.yml",
        )
        errors = validate_all([chart], [])
        a1_errors = [e for e in errors if e.rule == "A1"]
        assert len(a1_errors) == 1


# ---------------------------------------------------------------------------
# Empty dashboards / markdown-only dashboards
# ---------------------------------------------------------------------------


class TestEmptyAndMarkdownDashboards:
    def test_dashboard_with_no_tiles(self) -> None:
        """Dashboards with no tiles should produce no cross-ref errors."""
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=[],
        )
        chart = _chart(slug="some-chart")
        errors = validate_all([chart], [dash])
        assert errors == []

    def test_dashboard_with_only_markdown_tiles(self) -> None:
        """Dashboards that have no saved_chart tiles produce no B1/B2 errors.

        Markdown tiles are filtered during loading (they don't have chartSlug),
        so a dashboard with only markdown tiles has an empty chart_slugs list.
        """
        dash = _dashboard(
            space_slug=SHARED_DASHBOARDS_SPACE,
            chart_slugs=[],  # No chart refs because all tiles are markdown
        )
        errors = validate_all([], [dash])
        b_errors = [e for e in errors if e.rule.startswith("B")]
        assert b_errors == []


# ---------------------------------------------------------------------------
# validate_all integration
# ---------------------------------------------------------------------------


class TestValidateAll:
    def test_multiple_rules_violated(self) -> None:
        """Multiple violations across different rules should all be reported."""
        charts = [
            # A1 violation: chart in dashboards folder
            _chart(
                slug="misplaced-chart",
                space_slug=SHARED_DASHBOARDS_SPACE,
                file_path="misplaced.yml",
            ),
            # Normal shared chart
            _chart(
                slug="good-chart",
                space_slug=SHARED_CHARTS_SPACE,
                file_path="good.yml",
            ),
        ]
        dashboards = [
            # B1 violation: references chart not in shared charts
            _dashboard(
                slug="bad-dash",
                space_slug=SHARED_DASHBOARDS_SPACE,
                chart_slugs=["misplaced-chart"],
                file_path="bad-dash.yml",
            ),
        ]
        errors = validate_all(charts, dashboards)
        rules = {e.rule for e in errors}
        assert "A1" in rules
        assert "B1" in rules

    def test_fully_valid_setup_passes(self) -> None:
        """A properly organized setup should produce no errors."""
        charts = [
            _chart(slug="c1", space_slug=SHARED_CHARTS_SPACE, file_path="c1.yml"),
            _chart(slug="c2", space_slug=SHARED_CHARTS_SPACE, file_path="c2.yml"),
        ]
        dashboards = [
            _dashboard(
                slug="d1",
                space_slug=SHARED_DASHBOARDS_SPACE,
                chart_slugs=["c1", "c2"],
                file_path="d1.yml",
            ),
        ]
        errors = validate_all(charts, dashboards)
        assert errors == []
