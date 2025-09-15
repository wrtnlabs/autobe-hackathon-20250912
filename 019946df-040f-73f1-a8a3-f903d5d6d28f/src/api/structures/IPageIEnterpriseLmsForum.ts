import { IPage } from "./IPage";
import { IEnterpriseLmsForum } from "./IEnterpriseLmsForum";

export namespace IPageIEnterpriseLmsForum {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsForum.ISummary[];
  };
}
