import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerCrawlSchedule } from "./IPoliticalNewsCrawlerCrawlSchedule";

export namespace IPageIPoliticalNewsCrawlerCrawlSchedule {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerCrawlSchedule.ISummary[];
  };
}
