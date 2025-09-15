import { IPage } from "./IPage";
import { IHealthcarePlatformDataExportLog } from "./IHealthcarePlatformDataExportLog";

export namespace IPageIHealthcarePlatformDataExportLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformDataExportLog.ISummary[];
  };
}
