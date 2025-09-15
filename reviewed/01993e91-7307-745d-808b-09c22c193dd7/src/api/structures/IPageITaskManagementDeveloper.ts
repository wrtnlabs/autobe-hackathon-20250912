import { IPage } from "./IPage";
import { ITaskManagementDeveloper } from "./ITaskManagementDeveloper";

export namespace IPageITaskManagementDeveloper {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementDeveloper.ISummary[];
  };
}
