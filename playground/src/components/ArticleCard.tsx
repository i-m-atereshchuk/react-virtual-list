import { memo, type CSSProperties } from "react";
import type { GuardianArticle } from "../types/article";

type ArticleCardProps = {
  article: GuardianArticle;
  onClick?: (article: GuardianArticle) => void;
  style?: CSSProperties;
};

export const ArticleCard = memo(function ArticleCard({
  article,
  onClick,
  style = {},
}: ArticleCardProps) {
  const publicationDate = new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(article.webPublicationDate));

  return (
    <article
      className="article-card"
      style={{ overflow: "hidden", ...style }}
      onClick={() => onClick?.(article)}
    >
      {article.fields?.thumbnail && (
        <img
          className="article-card_img"
          loading="lazy"
          src={article.fields.thumbnail}
          width="220px"
          height="176px"
          alt=""
        />
      )}

      <div className="article-card_content">
        <span className="article-card_section">{article.sectionName}</span>
      </div>

      <h2 className="article-card_title">
        <a href={article.webUrl} target="_blank" rel="noreferrer">
          {article.webTitle}
        </a>
      </h2>

      {article.fields?.trailText && (
        <div
          className="article-card_description"
          dangerouslySetInnerHTML={{ __html: article.fields?.trailText }}
        />
      )}

      <time dateTime={article.webPublicationDate}>{publicationDate}</time>
    </article>
  );
});
