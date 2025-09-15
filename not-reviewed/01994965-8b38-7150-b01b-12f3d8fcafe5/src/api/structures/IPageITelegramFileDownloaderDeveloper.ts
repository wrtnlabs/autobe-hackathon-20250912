import { IPage } from "./IPage";
import { ITelegramFileDownloaderDeveloper } from "./ITelegramFileDownloaderDeveloper";

export namespace IPageITelegramFileDownloaderDeveloper {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITelegramFileDownloaderDeveloper.ISummary[];
  };
}
