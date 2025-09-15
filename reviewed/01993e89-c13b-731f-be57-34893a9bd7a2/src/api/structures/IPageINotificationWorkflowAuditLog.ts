import { IPage } from "./IPage";
import { INotificationWorkflowAuditLog } from "./INotificationWorkflowAuditLog";

export namespace IPageINotificationWorkflowAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowAuditLog.ISummary[];
  };
}
