import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerApiErrorLog } from "./IPoliticalNewsCrawlerApiErrorLog";

export namespace IPageIPoliticalNewsCrawlerApiErrorLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerApiErrorLog.ISummary[];
  };
}
