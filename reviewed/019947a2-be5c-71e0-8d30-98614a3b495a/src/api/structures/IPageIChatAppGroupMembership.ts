import { IPage } from "./IPage";
import { IChatAppGroupMembership } from "./IChatAppGroupMembership";

export namespace IPageIChatAppGroupMembership {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatAppGroupMembership.ISummary[];
  };
}
