import { IPage } from "./IPage";
import { IHealthcarePlatformAuditLog } from "./IHealthcarePlatformAuditLog";

export namespace IPageIHealthcarePlatformAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAuditLog.ISummary[];
  };
}
