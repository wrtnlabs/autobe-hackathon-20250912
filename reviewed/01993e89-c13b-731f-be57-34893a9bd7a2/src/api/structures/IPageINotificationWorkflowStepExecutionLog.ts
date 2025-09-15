import { IPage } from "./IPage";
import { INotificationWorkflowStepExecutionLog } from "./INotificationWorkflowStepExecutionLog";

export namespace IPageINotificationWorkflowStepExecutionLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowStepExecutionLog.ISummary[];
  };
}
