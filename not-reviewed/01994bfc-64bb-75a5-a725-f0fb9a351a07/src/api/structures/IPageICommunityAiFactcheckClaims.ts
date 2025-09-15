import { IPage } from "./IPage";
import { ICommunityAiFactcheckClaims } from "./ICommunityAiFactcheckClaims";

export namespace IPageICommunityAiFactcheckClaims {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiFactcheckClaims.ISummary[];
  };
}
