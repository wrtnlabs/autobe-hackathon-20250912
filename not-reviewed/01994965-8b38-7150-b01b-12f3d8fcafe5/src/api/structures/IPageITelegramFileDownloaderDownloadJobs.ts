import { IPage } from "./IPage";
import { ITelegramFileDownloaderDownloadJobs } from "./ITelegramFileDownloaderDownloadJobs";

export namespace IPageITelegramFileDownloaderDownloadJobs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITelegramFileDownloaderDownloadJobs.ISummary[];
  };
}
