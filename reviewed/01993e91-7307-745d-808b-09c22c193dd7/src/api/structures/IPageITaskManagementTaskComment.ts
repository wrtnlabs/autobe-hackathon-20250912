import { IPage } from "./IPage";
import { ITaskManagementTaskComment } from "./ITaskManagementTaskComment";

export namespace IPageITaskManagementTaskComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementTaskComment.ISummary[];
  };
}
