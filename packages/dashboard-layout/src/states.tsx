import type { CSSProperties } from "react";

import type {
  TileEmptyStateProps,
  TileErrorStateProps,
  TileLoadingStateProps,
  TileStateProps,
} from "./types";

const stateShellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "0.5rem",
  minHeight: "12rem",
  padding: "1rem",
  borderRadius: "0.75rem",
  backgroundColor: "rgba(148, 163, 184, 0.08)",
};

const stateTitleStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  lineHeight: 1.4,
};

const stateDescriptionStyle: CSSProperties = {
  color: "#475569",
  fontSize: "0.875rem",
  lineHeight: 1.5,
};

const loadingIndicatorStyle: CSSProperties = {
  width: "2rem",
  height: "2rem",
  borderRadius: "999px",
  background:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.05))",
};

function TileStateShell({
  title,
  description,
  children,
  role,
}: TileStateProps & { role?: "alert" | "status" }) {
  return (
    <div role={role} style={stateShellStyle}>
      {children}
      {title !== undefined ? <div style={stateTitleStyle}>{title}</div> : null}
      {description !== undefined ? (
        <div style={stateDescriptionStyle}>{description}</div>
      ) : null}
    </div>
  );
}

export function TileLoadingState({
  label = "Loading…",
}: TileLoadingStateProps) {
  return (
    <TileStateShell role="status" title={label}>
      <div aria-hidden="true" style={loadingIndicatorStyle} />
    </TileStateShell>
  );
}

export function TileEmptyState({ title, description }: TileEmptyStateProps) {
  return <TileStateShell title={title} description={description} />;
}

export function TileErrorState({ title, description }: TileErrorStateProps) {
  return <TileStateShell role="alert" title={title} description={description} />;
}
