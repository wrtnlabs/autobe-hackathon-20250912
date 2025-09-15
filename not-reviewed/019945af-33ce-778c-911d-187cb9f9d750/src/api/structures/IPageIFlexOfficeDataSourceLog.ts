import { IPage } from "./IPage";
import { IFlexOfficeDataSourceLog } from "./IFlexOfficeDataSourceLog";

export namespace IPageIFlexOfficeDataSourceLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeDataSourceLog.ISummary[];
  };
}
