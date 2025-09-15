import { IPage } from "./IPage";
import { ITaskManagementNotification } from "./ITaskManagementNotification";

export namespace IPageITaskManagementNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementNotification.ISummary[];
  };
}
