"use client";

import { useState, useEffect, useCallback } from "react";
import type { CategoryData } from "@/lib/types";

interface UseScorecardQueryResult {
  data: CategoryData[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useScorecardQuery(
  filters: Record<string, string[]>
): UseScorecardQueryResult {
  const [data, setData] = useState<CategoryData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lightdash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: filtersKey === "{}" ? JSON.stringify({}) : JSON.stringify({ filters }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
