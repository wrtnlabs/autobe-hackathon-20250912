import { IPage } from "./IPage";
import { ITaskManagementTasks } from "./ITaskManagementTasks";

export namespace IPageITaskManagementTasks {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementTasks.ISummary[];
  };
}
