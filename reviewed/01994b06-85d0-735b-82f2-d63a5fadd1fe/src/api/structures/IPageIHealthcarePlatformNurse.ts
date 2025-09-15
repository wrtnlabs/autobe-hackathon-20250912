import { IPage } from "./IPage";
import { IHealthcarePlatformNurse } from "./IHealthcarePlatformNurse";

export namespace IPageIHealthcarePlatformNurse {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformNurse.ISummary[];
  };
}
