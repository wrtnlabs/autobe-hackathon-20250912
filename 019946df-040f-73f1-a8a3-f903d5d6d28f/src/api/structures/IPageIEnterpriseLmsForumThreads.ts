import { IPage } from "./IPage";
import { IEnterpriseLmsForumThreads } from "./IEnterpriseLmsForumThreads";

export namespace IPageIEnterpriseLmsForumThreads {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsForumThreads.ISummary[];
  };
}
