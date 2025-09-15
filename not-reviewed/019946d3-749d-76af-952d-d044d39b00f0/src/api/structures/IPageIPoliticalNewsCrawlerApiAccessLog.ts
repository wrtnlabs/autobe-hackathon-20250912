import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerApiAccessLog } from "./IPoliticalNewsCrawlerApiAccessLog";

export namespace IPageIPoliticalNewsCrawlerApiAccessLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerApiAccessLog.ISummary[];
  };
}
