import { useCallback } from "react";
import { VirtualList } from "react-virtual-lite";

import { useLoadArticles } from "../hooks/use-load-articles";

import { ArticleCard } from "../components/ArticleCard";
// import { type GuardianArticle } from "../types/article";

export function Guardian() {
  const { articles, onReachEnd } = useLoadArticles();

  const handleArticleClick = useCallback(() => {}, []);
  return (
    <main
      style={{
        width: 700,
        margin: "40px auto",
        padding: 20,
        height: 600,
      }}
    >
      <VirtualList
        list={articles}
        estimatedRowSize={300}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        orientation="horizontal"
        renderItem={(item) => (
          <ArticleCard onClick={handleArticleClick} article={item} />
        )}
        onReachEnd={onReachEnd}
      />
    </main>
  );
}
