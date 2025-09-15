import { IPage } from "./IPage";
import { IHealthcarePlatformPermission } from "./IHealthcarePlatformPermission";

export namespace IPageIHealthcarePlatformPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformPermission.ISummary[];
  };
}
