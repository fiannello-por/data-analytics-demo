import type { CSSProperties } from "react";

import type { TileFrameProps } from "./types";

const frameStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  padding: "1rem",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  borderRadius: "0.75rem",
  backgroundColor: "#fff",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "1rem",
};

const headingStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  lineHeight: 1.4,
};

const subtitleStyle: CSSProperties = {
  color: "#475569",
  fontSize: "0.875rem",
  lineHeight: 1.5,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexShrink: 0,
};

const bodyStyle: CSSProperties = {
  minWidth: 0,
  flex: "1 1 auto",
};

export function TileFrame({
  title,
  subtitle,
  actions,
  children,
  style,
}: TileFrameProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || actions !== undefined;

  return (
    <section style={{ ...frameStyle, ...style }}>
      {hasHeader ? (
        <header style={headerStyle}>
          <div style={headingStyle}>
            {title !== undefined ? <div style={titleStyle}>{title}</div> : null}
            {subtitle !== undefined ? <div style={subtitleStyle}>{subtitle}</div> : null}
          </div>
          {actions !== undefined ? <div style={actionsStyle}>{actions}</div> : null}
        </header>
      ) : null}
      <div style={bodyStyle}>{children}</div>
    </section>
  );
}
