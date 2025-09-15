import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerLlmJobs } from "./IPoliticalNewsCrawlerLlmJobs";

export namespace IPageIPoliticalNewsCrawlerLlmJobs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerLlmJobs.ISummary[];
  };
}
