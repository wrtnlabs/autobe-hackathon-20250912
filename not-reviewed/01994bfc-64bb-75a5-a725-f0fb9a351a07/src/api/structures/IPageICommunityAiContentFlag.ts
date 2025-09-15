import { IPage } from "./IPage";
import { ICommunityAiContentFlag } from "./ICommunityAiContentFlag";

export namespace IPageICommunityAiContentFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiContentFlag.ISummary[];
  };
}
