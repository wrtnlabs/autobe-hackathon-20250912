import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerProcessedContent } from "./IPoliticalNewsCrawlerProcessedContent";

export namespace IPageIPoliticalNewsCrawlerProcessedContent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerProcessedContent.ISummary[];
  };
}
