import { IPage } from "./IPage";
import { ITaskManagementPriorities } from "./ITaskManagementPriorities";

export namespace IPageITaskManagementPriorities {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementPriorities.ISummary[];
  };
}
