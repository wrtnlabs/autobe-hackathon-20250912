import { IPage } from "./IPage";
import { IHealthcarePlatformOrganizationAdmin } from "./IHealthcarePlatformOrganizationAdmin";

export namespace IPageIHealthcarePlatformOrganizationadmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformOrganizationAdmin.ISummary[];
  };
}
