import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerCrawlPolicy } from "./IPoliticalNewsCrawlerCrawlPolicy";

export namespace IPageIPoliticalNewsCrawlerCrawlPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerCrawlPolicy.ISummary[];
  };
}
