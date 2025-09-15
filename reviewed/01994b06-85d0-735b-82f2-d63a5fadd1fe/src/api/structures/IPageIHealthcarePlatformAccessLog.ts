import { IPage } from "./IPage";
import { IHealthcarePlatformAccessLog } from "./IHealthcarePlatformAccessLog";

export namespace IPageIHealthcarePlatformAccessLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAccessLog.ISummary[];
  };
}
