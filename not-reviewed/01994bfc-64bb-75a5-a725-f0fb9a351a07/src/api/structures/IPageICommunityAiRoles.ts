import { IPage } from "./IPage";
import { ICommunityAiRoles } from "./ICommunityAiRoles";

export namespace IPageICommunityAiRoles {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiRoles.ISummary[];
  };
}
