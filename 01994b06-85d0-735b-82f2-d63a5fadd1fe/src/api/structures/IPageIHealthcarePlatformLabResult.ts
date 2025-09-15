import { IPage } from "./IPage";
import { IHealthcarePlatformLabResult } from "./IHealthcarePlatformLabResult";

export namespace IPageIHealthcarePlatformLabResult {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformLabResult.ISummary[];
  };
}
