import { IPage } from "./IPage";
import { IHealthcarePlatformUserCredential } from "./IHealthcarePlatformUserCredential";

export namespace IPageIHealthcarePlatformUserCredential {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformUserCredential.ISummary[];
  };
}
