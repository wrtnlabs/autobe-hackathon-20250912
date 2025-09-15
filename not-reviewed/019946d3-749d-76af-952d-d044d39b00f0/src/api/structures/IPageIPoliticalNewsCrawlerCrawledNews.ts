import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerCrawledNews } from "./IPoliticalNewsCrawlerCrawledNews";

export namespace IPageIPoliticalNewsCrawlerCrawledNews {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerCrawledNews.ISummary[];
  };
}
