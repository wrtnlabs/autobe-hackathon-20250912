import { IPage } from "./IPage";
import { INotificationWorkflowWorkerService } from "./INotificationWorkflowWorkerService";

export namespace IPageINotificationWorkflowWorkerservice {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: INotificationWorkflowWorkerService.ISummary[];
  };
}
