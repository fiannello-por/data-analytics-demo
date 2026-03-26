import type { CSSProperties, ReactNode } from "react";

export type TileFrameProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
};

export type TileStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

export type TileLoadingStateProps = {
  label?: ReactNode;
};

export type TileEmptyStateProps = TileStateProps;

export type TileErrorStateProps = TileStateProps;

export type DashboardSplitProps = {
  leading: ReactNode;
  trailing: ReactNode;
  direction?: CSSProperties["flexDirection"];
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  style?: CSSProperties;
};

export type DashboardGridProps = {
  children: ReactNode;
  columns?: number;
  minColumnWidth?: number | string;
  gap?: number | string;
  style?: CSSProperties;
};

export type DashboardStackProps = {
  children: ReactNode;
  gap?: number | string;
  style?: CSSProperties;
};
