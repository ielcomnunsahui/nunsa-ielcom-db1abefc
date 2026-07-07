import { supabase } from "@/integrations/supabase/client";

/**
 * Paginates a Supabase query in 1000-row chunks to bypass the default PostgREST limit.
 * Usage:
 *   const rows = await fetchAll("voters", (q) => q.select("id, voted"));
 */
export async function fetchAll<T = any>(
  table: string,
  builder: (q: any) => any,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Loop until we get fewer than pageSize rows
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = builder((supabase as any).from(table)).range(from, from + pageSize - 1);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/** Exact count of rows matching a filter (no row limit). */
export async function countAll(
  table: string,
  filter?: (q: any) => any
): Promise<number> {
  let q = (supabase as any).from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
