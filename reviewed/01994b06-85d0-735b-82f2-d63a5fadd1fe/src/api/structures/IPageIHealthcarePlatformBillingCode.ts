import { IPage } from "./IPage";
import { IHealthcarePlatformBillingCode } from "./IHealthcarePlatformBillingCode";

export namespace IPageIHealthcarePlatformBillingCode {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingCode.ISummary[];
  };
}
