import { IPage } from "./IPage";
import { ICommunityAiPermission } from "./ICommunityAiPermission";

export namespace IPageICommunityAiPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiPermission.ISummary[];
  };
}
