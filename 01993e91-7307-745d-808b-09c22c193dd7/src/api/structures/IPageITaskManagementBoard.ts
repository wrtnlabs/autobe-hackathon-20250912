import { IPage } from "./IPage";
import { ITaskManagementBoard } from "./ITaskManagementBoard";

export namespace IPageITaskManagementBoard {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementBoard.ISummary[];
  };
}
