import { useState, useEffect, useCallback } from "react";

export interface PrintedLabel {
  id: string;
  shipment_id: number;
  order_id: number | null;
  tracking_number: string | null;
  buyer_nickname: string | null;
  sku: string | null;
  variation: string | null;
  quantity: number | null;
  account_id: string | null;
  shipping_method: string | null;
  file_path: string;
  print_date: string;
  meli_user_id: string;
}

export const useSearchPrintedLabels = (
  accountId?: string,
  meliUserId?: string
) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrintedLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debounce 300ms
    const timer = setTimeout(() => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      const fetchResults = async () => {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams({
            q: query,
            limit: "50",
          });

          if (accountId) params.append("account_id", accountId);
          if (meliUserId) params.append("meli_user_id", meliUserId);

          const res = await fetch(
            `/api/meli-labels/search?${params.toString()}`
          );
          if (!res.ok) throw new Error("Search failed");

          const data: { results: PrintedLabel[] } = await res.json();
          setResults(data.results);
        } catch (err) {
          setError((err as Error).message);
          setResults([]);
        } finally {
          setLoading(false);
        }
      };

      fetchResults();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, accountId, meliUserId]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch,
  };
};
