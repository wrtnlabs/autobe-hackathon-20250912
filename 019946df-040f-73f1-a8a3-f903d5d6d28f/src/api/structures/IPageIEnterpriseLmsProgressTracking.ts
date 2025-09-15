import { IPage } from "./IPage";
import { IEnterpriseLmsProgressTracking } from "./IEnterpriseLmsProgressTracking";

export namespace IPageIEnterpriseLmsProgressTracking {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsProgressTracking.ISummary[];
  };
}
