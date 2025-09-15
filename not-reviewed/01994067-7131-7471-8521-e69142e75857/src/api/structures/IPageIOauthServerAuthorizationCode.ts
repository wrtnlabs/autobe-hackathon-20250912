import { IPage } from "./IPage";
import { IOauthServerAuthorizationCode } from "./IOauthServerAuthorizationCode";

export namespace IPageIOauthServerAuthorizationCode {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerAuthorizationCode.ISummary[];
  };
}
