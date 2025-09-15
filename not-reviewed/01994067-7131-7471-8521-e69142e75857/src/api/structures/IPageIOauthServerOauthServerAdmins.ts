import { IPage } from "./IPage";
import { IOauthServerOauthServerAdmins } from "./IOauthServerOauthServerAdmins";

export namespace IPageIOauthServerOauthServerAdmins {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerOauthServerAdmins.ISummary[];
  };
}
