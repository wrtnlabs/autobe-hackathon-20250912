import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerCrawlAttempt } from "./IPoliticalNewsCrawlerCrawlAttempt";

export namespace IPageIPoliticalNewsCrawlerCrawlAttempt {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerCrawlAttempt.ISummary[];
  };
}
