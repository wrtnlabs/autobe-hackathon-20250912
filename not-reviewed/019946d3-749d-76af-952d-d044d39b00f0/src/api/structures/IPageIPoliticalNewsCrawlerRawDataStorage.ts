import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerRawDataStorage } from "./IPoliticalNewsCrawlerRawDataStorage";

export namespace IPageIPoliticalNewsCrawlerRawDataStorage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerRawDataStorage.ISummary[];
  };
}
