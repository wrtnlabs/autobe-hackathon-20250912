import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerRawDataStorageLocalCacheFile } from "./IPoliticalNewsCrawlerRawDataStorageLocalCacheFile";

export namespace IPageIPoliticalNewsCrawlerRawDataStorageLocalCacheFile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerRawDataStorageLocalCacheFile.ISummary[];
  };
}
