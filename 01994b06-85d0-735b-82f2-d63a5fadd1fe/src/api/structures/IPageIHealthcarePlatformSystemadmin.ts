import { IPage } from "./IPage";
import { IHealthcarePlatformSystemAdmin } from "./IHealthcarePlatformSystemAdmin";

export namespace IPageIHealthcarePlatformSystemadmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformSystemAdmin.ISummary[];
  };
}
