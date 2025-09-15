import { IPage } from "./IPage";
import { ICommunityAiComments } from "./ICommunityAiComments";

export namespace IPageICommunityAiComments {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiComments.ISummary[];
  };
}
