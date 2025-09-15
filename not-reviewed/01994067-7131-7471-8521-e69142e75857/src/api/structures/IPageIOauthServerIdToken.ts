import { IPage } from "./IPage";
import { IOauthServerIdToken } from "./IOauthServerIdToken";

export namespace IPageIOauthServerIdToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerIdToken.ISummary[];
  };
}
