import { IPage } from "./IPage";
import { IFlexOfficeAuditLog } from "./IFlexOfficeAuditLog";

export namespace IPageIFlexOfficeAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeAuditLog.ISummary[];
  };
}
