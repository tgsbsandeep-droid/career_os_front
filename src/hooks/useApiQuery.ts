import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api";

export type ApiQueryState<T> =
  | { status: "idle"; data: null; error: null; loading: false }
  | { status: "loading"; data: null; error: null; loading: true }
  | { status: "success"; data: T; error: null; loading: false }
  | { status: "error"; data: null; error: string; loading: false };

export type UseApiQueryOptions<T> = {
  /** Set to false to skip the fetch (e.g. while waiting for a userId). */
  enabled?: boolean;
  /** Called after a successful fetch. */
  onSuccess?: (data: T) => void;
  /** Called after a failed fetch. */
  onError?: (message: string) => void;
};

/**
 * Minimal data-fetching hook that wraps `apiRequest`.
 *
 * Usage:
 * ```ts
 * const { data, loading, error, refetch } = useApiQuery<{ jobs: Job[] }>(
 *   "/api/jobs",
 *   { enabled: Boolean(userId) },
 * );
 * ```
 *
 * - Re-fetches automatically when `path` or `enabled` changes.
 * - Ignores stale responses when the component unmounts or the path changes.
 * - `refetch()` triggers a manual re-fetch.
 */
export function useApiQuery<T>(
  path: string | null | undefined,
  options: UseApiQueryOptions<T> = {},
): ApiQueryState<T> & { refetch: () => void } {
  const { enabled = true, onSuccess, onError } = options;

  const [state, setState] = useState<ApiQueryState<T>>({
    status: "idle",
    data: null,
    error: null,
    loading: false,
  });

  // Stable refs so callbacks don't cause re-fetches.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  // Increment to trigger a manual refetch.
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !path) {
      setState({ status: "idle", data: null, error: null, loading: false });
      return;
    }

    let cancelled = false;

    setState({ status: "loading", data: null, error: null, loading: true });

    apiRequest<T>(path)
      .then((data) => {
        if (cancelled) return;
        setState({ status: "success", data, error: null, loading: false });
        onSuccessRef.current?.(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err ?? "Request failed");
        setState({ status: "error", data: null, error: message, loading: false });
        onErrorRef.current?.(message);
      });

    return () => {
      cancelled = true;
    };
    // fetchCount is intentionally included so refetch() works.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, fetchCount]);

  return { ...state, refetch };
}