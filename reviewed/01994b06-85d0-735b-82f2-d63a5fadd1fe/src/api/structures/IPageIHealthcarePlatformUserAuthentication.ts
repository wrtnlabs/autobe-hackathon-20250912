import { IPage } from "./IPage";
import { IHealthcarePlatformUserAuthentication } from "./IHealthcarePlatformUserAuthentication";

export namespace IPageIHealthcarePlatformUserAuthentication {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformUserAuthentication.ISummary[];
  };
}
