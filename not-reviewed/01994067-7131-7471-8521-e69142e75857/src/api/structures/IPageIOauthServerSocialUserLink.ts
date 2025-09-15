import { IPage } from "./IPage";
import { IOauthServerSocialUserLink } from "./IOauthServerSocialUserLink";

export namespace IPageIOauthServerSocialUserLink {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerSocialUserLink.ISummary[];
  };
}
