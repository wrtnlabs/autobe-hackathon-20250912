import { IPage } from "./IPage";
import { ITelegramFileDownloaderEndUser } from "./ITelegramFileDownloaderEndUser";

export namespace IPageITelegramFileDownloaderEnduser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITelegramFileDownloaderEndUser.ISummary[];
  };
}
