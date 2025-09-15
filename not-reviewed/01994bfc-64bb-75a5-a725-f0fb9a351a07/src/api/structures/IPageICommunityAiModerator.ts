import { IPage } from "./IPage";
import { ICommunityAiModerator } from "./ICommunityAiModerator";

export namespace IPageICommunityAiModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiModerator.ISummary[];
  };
}
