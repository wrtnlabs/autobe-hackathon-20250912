import { IPage } from "./IPage";
import { IEnterpriseLmsSecurityAuditLog } from "./IEnterpriseLmsSecurityAuditLog";

export namespace IPageIEnterpriseLmsSecurityAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsSecurityAuditLog.ISummary[];
  };
}
