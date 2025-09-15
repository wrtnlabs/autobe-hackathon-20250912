import { IPage } from "./IPage";
import { IOauthServerguests } from "./IOauthServerguests";

export namespace IPageIOauthServerguests {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerguests.ISummary[];
  };
}
