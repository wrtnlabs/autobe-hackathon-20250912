import { IPage } from "./IPage";
import { IHealthcarePlatformBillingPayment } from "./IHealthcarePlatformBillingPayment";

export namespace IPageIHealthcarePlatformBillingPayment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingPayment.ISummary[];
  };
}
