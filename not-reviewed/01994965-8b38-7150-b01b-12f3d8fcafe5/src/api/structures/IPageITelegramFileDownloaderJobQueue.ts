import { IPage } from "./IPage";
import { ITelegramFileDownloaderJobQueue } from "./ITelegramFileDownloaderJobQueue";

export namespace IPageITelegramFileDownloaderJobQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITelegramFileDownloaderJobQueue.ISummary[];
  };
}
