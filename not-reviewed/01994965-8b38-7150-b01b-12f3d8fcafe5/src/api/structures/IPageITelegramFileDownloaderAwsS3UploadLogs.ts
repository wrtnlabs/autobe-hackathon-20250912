import { IPage } from "./IPage";
import { ITelegramFileDownloaderAwsS3UploadLogs } from "./ITelegramFileDownloaderAwsS3UploadLogs";

export namespace IPageITelegramFileDownloaderAwsS3UploadLogs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITelegramFileDownloaderAwsS3UploadLogs.ISummary[];
  };
}
