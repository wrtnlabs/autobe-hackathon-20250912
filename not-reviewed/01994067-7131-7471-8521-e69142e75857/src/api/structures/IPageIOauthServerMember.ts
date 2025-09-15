import { IPage } from "./IPage";
import { IOauthServerMember } from "./IOauthServerMember";

export namespace IPageIOauthServerMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerMember.ISummary[];
  };
}
