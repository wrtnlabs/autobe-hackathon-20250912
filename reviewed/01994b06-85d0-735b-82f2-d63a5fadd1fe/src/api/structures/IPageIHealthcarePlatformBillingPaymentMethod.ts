import { IPage } from "./IPage";
import { IHealthcarePlatformBillingPaymentMethod } from "./IHealthcarePlatformBillingPaymentMethod";

export namespace IPageIHealthcarePlatformBillingPaymentMethod {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingPaymentMethod.ISummary[];
  };
}
