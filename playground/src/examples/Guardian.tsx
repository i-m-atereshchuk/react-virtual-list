import { useCallback, useRef } from "react";
import { VirtualList, type VirtualListRef } from "react-virtual-lite";

import { useLoadArticles } from "../hooks/use-load-articles";

import { ArticleCard } from "../components/ArticleCard";

let i = 19;
export function Guardian() {
  const refVirtualList = useRef<VirtualListRef>(null);
  const { articles, onReachEnd } = useLoadArticles();

  const handleButtonClick = () => {
    refVirtualList.current?.scrollToOffset(1500);
  };

  const handleButtonClickIndex = () => {
    refVirtualList.current?.scrollToIndex(i).then(() => {
      console.log("scrollToIndex completed");
      i += 10;
    });
  };

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
      <div onClick={handleButtonClick}>
        <button>Scroll to offset</button>
      </div>
      <div onClick={handleButtonClickIndex}>
        <button>Scroll to index</button>
      </div>
      <div
        style={{
          height: 700,
          width: "100%",
          border: "1px white solid",
        }}
      >
        <VirtualList
          ref={refVirtualList}
          list={articles}
          estimatedRowSize={300}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          orientation="vertical"
          renderItem={(item) => (
            <ArticleCard onClick={handleArticleClick} article={item} />
          )}
          onReachEnd={() => {
            onReachEnd();
          }}
        />
      </div>
    </main>
  );
}
