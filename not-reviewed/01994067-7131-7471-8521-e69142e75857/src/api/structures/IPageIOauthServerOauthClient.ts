import { IPage } from "./IPage";
import { IOauthServerOauthClient } from "./IOauthServerOauthClient";

export namespace IPageIOauthServerOauthClient {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerOauthClient.ISummary[];
  };
}
