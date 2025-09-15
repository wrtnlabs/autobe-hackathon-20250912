import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerPopularityScore } from "./IPoliticalNewsCrawlerPopularityScore";

export namespace IPageIPoliticalNewsCrawlerPopularityScore {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerPopularityScore.ISummary[];
  };
}
