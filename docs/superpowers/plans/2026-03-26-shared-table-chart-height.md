# Shared Table/Chart Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the table/chart row share one height so the chart never exceeds the table, while preserving a minimum readable chart height.

**Architecture:** Move height ownership to the shared table/chart row and remove independent chart height rules. The trend panel and chart should fill the row height, and the chart plot area should flex within the remaining vertical space after the panel header content.

**Tech Stack:** React, Next.js, Tailwind CSS, Recharts, Vitest

---

### Task 1: Lock in the expected shared-height contract

**Files:**
- Modify: `apps/situation-room/__tests__/trend-panel.test.tsx`
- Modify: `apps/situation-room/__tests__/trend-chart.test.tsx`

- [ ] **Step 1: Write failing test assertions**
- [ ] **Step 2: Run targeted tests to confirm they fail**
- [ ] **Step 3: Implement minimal layout changes**
- [ ] **Step 4: Run targeted tests to confirm they pass**

### Task 2: Move height ownership to the shared row

**Files:**
- Modify: `apps/situation-room/components/dashboard/dashboard-shell.tsx`
- Modify: `apps/situation-room/components/dashboard/trend-panel.tsx`
- Modify: `apps/situation-room/components/trend-chart.tsx`

- [ ] **Step 1: Add a row-level minimum height for the table/chart container**
- [ ] **Step 2: Make the trend panel fill the shared row height**
- [ ] **Step 3: Make the trend chart consume remaining space instead of owning fixed height**
- [ ] **Step 4: Verify focused tests still pass**
