import { IPage } from "./IPage";
import { ITaskManagementQa } from "./ITaskManagementQa";

export namespace IPageITaskManagementQa {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementQa.ISummary[];
  };
}
