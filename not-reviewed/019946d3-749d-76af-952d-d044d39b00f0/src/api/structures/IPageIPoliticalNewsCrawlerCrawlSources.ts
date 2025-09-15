import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerCrawlSources } from "./IPoliticalNewsCrawlerCrawlSources";

export namespace IPageIPoliticalNewsCrawlerCrawlSources {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerCrawlSources.ISummary[];
  };
}
