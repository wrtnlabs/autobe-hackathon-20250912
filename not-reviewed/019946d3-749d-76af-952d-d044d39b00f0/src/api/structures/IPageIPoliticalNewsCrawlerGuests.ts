import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerGuests } from "./IPoliticalNewsCrawlerGuests";

export namespace IPageIPoliticalNewsCrawlerGuests {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerGuests.ISummary[];
  };
}
