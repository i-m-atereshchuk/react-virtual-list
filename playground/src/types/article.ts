export type GuardianArticle = {
  id: string;
  type: "article" | "liveblog" | string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  apiUrl: string;
  isHosted: boolean;
  pillarId: string;
  pillarName: string;
  fields?: {
    thumbnail?: string;
    trailText?: string;
  };
};

export type GuardianResponseData = {
  status: string;
  userTier: string;
  total: number;
  startIndex: number;
  pageSize: number;
  currentPage: number;
  pages: number;
  orderBy: string;
  results: GuardianArticle[];
};

export type GuardianApiResponse = {
  response: GuardianResponseData;
};
