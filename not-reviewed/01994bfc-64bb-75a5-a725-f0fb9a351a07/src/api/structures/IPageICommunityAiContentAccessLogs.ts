import { IPage } from "./IPage";
import { ICommunityAiContentAccessLogs } from "./ICommunityAiContentAccessLogs";

export namespace IPageICommunityAiContentAccessLogs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiContentAccessLogs.ISummary[];
  };
}
