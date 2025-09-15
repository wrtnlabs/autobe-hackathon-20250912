import { IPage } from "./IPage";
import { ITaskManagementTaskStatuses } from "./ITaskManagementTaskStatuses";

export namespace IPageITaskManagementTaskStatuses {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementTaskStatuses.ISummary[];
  };
}
