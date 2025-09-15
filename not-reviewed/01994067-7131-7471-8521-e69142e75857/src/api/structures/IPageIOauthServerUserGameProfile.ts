import { IPage } from "./IPage";
import { IOauthServerUserGameProfile } from "./IOauthServerUserGameProfile";

export namespace IPageIOauthServerUserGameProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerUserGameProfile.ISummary[];
  };
}
