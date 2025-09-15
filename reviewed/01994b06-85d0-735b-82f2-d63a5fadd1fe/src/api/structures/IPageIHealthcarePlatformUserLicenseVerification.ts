import { IPage } from "./IPage";
import { IHealthcarePlatformUserLicenseVerification } from "./IHealthcarePlatformUserLicenseVerification";

export namespace IPageIHealthcarePlatformUserLicenseVerification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformUserLicenseVerification.ISummary[];
  };
}
