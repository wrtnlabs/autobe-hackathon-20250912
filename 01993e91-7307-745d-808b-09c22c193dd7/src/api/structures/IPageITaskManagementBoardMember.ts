import { IPage } from "./IPage";
import { ITaskManagementBoardMember } from "./ITaskManagementBoardMember";

export namespace IPageITaskManagementBoardMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITaskManagementBoardMember.ISummary[];
  };
}
