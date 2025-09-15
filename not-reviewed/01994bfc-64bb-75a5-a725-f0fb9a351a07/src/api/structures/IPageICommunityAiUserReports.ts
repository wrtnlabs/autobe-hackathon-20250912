import { IPage } from "./IPage";
import { ICommunityAiUserReports } from "./ICommunityAiUserReports";

export namespace IPageICommunityAiUserReports {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiUserReports.ISummary[];
  };
}
