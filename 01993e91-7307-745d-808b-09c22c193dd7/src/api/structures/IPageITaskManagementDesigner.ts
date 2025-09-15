import { IPage } from "./IPage";
import { ITaskManagementDesigner } from "./ITaskManagementDesigner";

export namespace IPageITaskManagementDesigner {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementDesigner.ISummary[];
  };
}
