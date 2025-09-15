import { IPage } from "./IPage";
import { IOauthServerAccessToken } from "./IOauthServerAccessToken";

export namespace IPageIOauthServerAccessToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerAccessToken.ISummary[];
  };
}
