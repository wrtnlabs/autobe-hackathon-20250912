import { IPage } from "./IPage";
import { ITaskManagementProject } from "./ITaskManagementProject";

export namespace IPageITaskManagementProject {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementProject.ISummary[];
  };
}
