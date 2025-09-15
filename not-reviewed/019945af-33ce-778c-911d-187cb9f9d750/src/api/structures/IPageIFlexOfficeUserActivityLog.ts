import { IPage } from "./IPage";
import { IFlexOfficeUserActivityLog } from "./IFlexOfficeUserActivityLog";

export namespace IPageIFlexOfficeUserActivityLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeUserActivityLog.ISummary[];
  };
}
