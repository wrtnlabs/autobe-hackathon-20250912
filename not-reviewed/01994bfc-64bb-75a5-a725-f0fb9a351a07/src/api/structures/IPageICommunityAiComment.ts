import { IPage } from "./IPage";
import { ICommunityAiComment } from "./ICommunityAiComment";

export namespace IPageICommunityAiComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiComment.ISummary[];
  };
}
