import { IPage } from "./IPage";
import { IEnterpriseLmsAuditLog } from "./IEnterpriseLmsAuditLog";

export namespace IPageIEnterpriseLmsAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsAuditLog.ISummary[];
  };
}
