import { IPage } from "./IPage";
import { ICommunityAiAiCommentSuggestion } from "./ICommunityAiAiCommentSuggestion";

export namespace IPageICommunityAiAiCommentSuggestion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiAiCommentSuggestion.ISummary[];
  };
}
