import { IPage } from "./IPage";
import { INotificationWorkflowSystemAdmin } from "./INotificationWorkflowSystemAdmin";

export namespace IPageINotificationWorkflowSystemAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowSystemAdmin.ISummary[];
  };
}
