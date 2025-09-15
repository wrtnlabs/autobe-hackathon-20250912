import { IPage } from "./IPage";
import { IOauthServerScope } from "./IOauthServerScope";

export namespace IPageIOauthServerScope {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerScope.ISummary[];
  };
}
