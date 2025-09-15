import { IPage } from "./IPage";
import { ICommunityAiFactcheckFlag } from "./ICommunityAiFactcheckFlag";

export namespace IPageICommunityAiFactcheckFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiFactcheckFlag.ISummary[];
  };
}
