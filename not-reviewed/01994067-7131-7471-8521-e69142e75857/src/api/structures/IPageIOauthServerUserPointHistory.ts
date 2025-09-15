import { IPage } from "./IPage";
import { IOauthServerUserPointHistory } from "./IOauthServerUserPointHistory";

export namespace IPageIOauthServerUserPointHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerUserPointHistory.ISummary[];
  };
}
