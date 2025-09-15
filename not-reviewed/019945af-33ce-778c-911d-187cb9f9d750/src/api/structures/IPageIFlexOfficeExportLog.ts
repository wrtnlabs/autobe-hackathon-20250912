import { IPage } from "./IPage";
import { IFlexOfficeExportLog } from "./IFlexOfficeExportLog";

export namespace IPageIFlexOfficeExportLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeExportLog.ISummary[];
  };
}
