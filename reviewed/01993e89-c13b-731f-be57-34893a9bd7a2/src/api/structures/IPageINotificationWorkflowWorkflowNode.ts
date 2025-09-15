import { IPage } from "./IPage";
import { INotificationWorkflowWorkflowNode } from "./INotificationWorkflowWorkflowNode";

export namespace IPageINotificationWorkflowWorkflowNode {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowWorkflowNode.ISummary[];
  };
}
