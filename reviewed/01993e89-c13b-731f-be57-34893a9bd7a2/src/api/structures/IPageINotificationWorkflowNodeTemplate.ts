import { IPage } from "./IPage";
import { INotificationWorkflowNodeTemplate } from "./INotificationWorkflowNodeTemplate";

export namespace IPageINotificationWorkflowNodeTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowNodeTemplate.ISummary[];
  };
}
