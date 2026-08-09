import { useState, useEffect, useRef, useCallback } from "react";
import { getArticles } from "../api/guardian";
import type { GuardianArticle } from "../types/article";

export function useLoadArticles() {
  const [articles, setArticles] = useState<GuardianArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(2);

  const pageRef = useRef(page);
  const totalPagesRef = useRef(2);
  const controller = useRef<AbortController | null>(null);
  const loadingRef = useRef(isLoading);

  function setLoading(v: boolean) {
    setIsLoading(v);
    loadingRef.current = v;
  }

  async function loadArticles(pageNumber: number) {
    if (loadingRef.current) {
      return;
    }
    controller.current = new AbortController();
    setLoading(true);

    try {
      const newArticles = await getArticles(pageNumber);
      if (controller.current?.signal.aborted) {
        return;
      }

      setArticles((prev) => [...prev, ...newArticles.results]);
      setPage(newArticles.currentPage);
      setTotalPages(newArticles.pages);
      totalPagesRef.current = newArticles.pages;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      if (controller.current?.signal.aborted) {
        // return;
      }
      setLoading(false);
    }
  }

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (loadingRef.current) {
      return;
    }

    loadArticles(page);
  }, [page]);

  const onReachEnd = useCallback(() => {
    if (loadingRef.current) {
      return;
    }

    setPage((prev) => prev + 1);
  }, []);

  return {
    isLoading,
    articles,
    onReachEnd,
    totalPages,
    page,
    error,
  };
}
