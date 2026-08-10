import { useCallback, useRef, useState } from "react";
import { VirtualList, type VirtualListRef } from "react-virtual-lite";

import { useLoadArticles } from "../hooks/use-load-articles";

import { ArticleCard } from "../components/ArticleCard";
// import { type GuardianArticle } from "../types/article";

export function Guardian() {
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const refVirtualList = useRef<VirtualListRef>(null);
  const { articles, onReachEnd } = useLoadArticles();

  const handleButtonClick = () => {
    refVirtualList.current?.scrollToOffset(1500);
  };
  const handleButtonClickIndex = () => {
    console.log(articles.length);

    refVirtualList.current?.scrollToIndex(1);
  };

  const handleArticleClick = useCallback(() => {}, []);
  const handleToggleOrientation = () => {
    setOrientation((prev) => {
      if (prev === "horizontal") {
        return "vertical";
      }

      return "horizontal";
    });
  };

  const articleCardStyles =
    orientation === "horizontal"
      ? {
          width: "350px",
          height: "100%",
        }
      : {};
  return (
    <main
      style={{
        width: "100%",
        margin: "40px auto",
        padding: 0,
        height: 600,
      }}
    >
      <div onClick={handleToggleOrientation}>
        <button>Toggle orientation</button>
      </div>
      <div onClick={handleButtonClick}>
        <button>Scroll to offset</button>
      </div>
      <div onClick={handleButtonClickIndex}>
        <button>Scroll to index</button>
      </div>
      <div
        style={{
          height: 350,
          width: "100%",
          border: "1px white solid",
          boxSizing: "border-box",
        }}
      >
        <VirtualList
          ref={refVirtualList}
          list={articles}
          estimatedRowSize={300}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          orientation={orientation}
          renderItem={(item) => (
            <ArticleCard
              onClick={handleArticleClick}
              article={item}
              style={articleCardStyles}
            />
          )}
          onReachEnd={onReachEnd}
        />
      </div>
    </main>
  );
}
