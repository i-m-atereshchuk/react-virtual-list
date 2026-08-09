import type { GuardianApiResponse } from "../types/article";

const apiUrl = "https://content.guardianapis.com/search";
const apiKey = import.meta.env.VITE_GUARDIAN_API_KEY;

export async function getArticles(page: number) {
  if (!apiKey) {
    throw new Error(
      "Guardianapis requires apiKey, add VITE_GUARDIAN_API_KEY to .env",
    );
  }

  const searchParams = new URLSearchParams({
    "api-key": apiKey,
    page: `${page}`,
    "page-size": "20",
    "order-by": "newest",
    "show-fields": "thumbnail,trailText",
  });

  const response = await fetch(`${apiUrl}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Guardian API request failed: ${response.status}`);
  }

  const data: GuardianApiResponse = await response.json();

  return {
    currentPage: data.response.currentPage,
    pages: data.response.pages,
    results: data.response.results,
  };
}
