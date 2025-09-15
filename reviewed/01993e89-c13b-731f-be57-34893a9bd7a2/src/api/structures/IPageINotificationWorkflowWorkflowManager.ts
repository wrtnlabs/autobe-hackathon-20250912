import { IPage } from "./IPage";
import { INotificationWorkflowWorkflowManager } from "./INotificationWorkflowWorkflowManager";

export namespace IPageINotificationWorkflowWorkflowManager {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowWorkflowManager.ISummary[];
  };
}
