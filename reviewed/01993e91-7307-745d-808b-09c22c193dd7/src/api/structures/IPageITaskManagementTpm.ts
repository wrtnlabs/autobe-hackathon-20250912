import { IPage } from "./IPage";
import { ITaskManagementTpm } from "./ITaskManagementTpm";

export namespace IPageITaskManagementTpm {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementTpm.ISummary[];
  };
}
