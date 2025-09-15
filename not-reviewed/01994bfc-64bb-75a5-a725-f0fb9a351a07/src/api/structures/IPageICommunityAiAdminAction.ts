import { IPage } from "./IPage";
import { ICommunityAiAdminAction } from "./ICommunityAiAdminAction";

export namespace IPageICommunityAiAdminAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiAdminAction.ISummary[];
  };
}
