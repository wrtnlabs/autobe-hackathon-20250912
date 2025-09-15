import { IPage } from "./IPage";
import { IOauthServerRefreshToken } from "./IOauthServerRefreshToken";

export namespace IPageIOauthServerRefreshToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerRefreshToken.ISummary[];
  };
}
