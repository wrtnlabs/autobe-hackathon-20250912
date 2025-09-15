import { IPage } from "./IPage";
import { INotificationWorkflowTriggerInstance } from "./INotificationWorkflowTriggerInstance";

export namespace IPageINotificationWorkflowTriggerInstance {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowTriggerInstance.ISummary[];
  };
}
