import { IPage } from "./IPage";
import { IOauthServerTokenMonitor } from "./IOauthServerTokenMonitor";

export namespace IPageIOauthServerTokenMonitor {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerTokenMonitor.ISummary[];
  };
}
