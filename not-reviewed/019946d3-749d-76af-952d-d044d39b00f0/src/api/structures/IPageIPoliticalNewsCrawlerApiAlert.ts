import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerApiAlert } from "./IPoliticalNewsCrawlerApiAlert";

export namespace IPageIPoliticalNewsCrawlerApiAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerApiAlert.ISummary[];
  };
}
