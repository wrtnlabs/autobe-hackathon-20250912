import { IPage } from "./IPage";
import { ICommunityAiMember } from "./ICommunityAiMember";

export namespace IPageICommunityAiMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiMember.ISummary[];
  };
}
