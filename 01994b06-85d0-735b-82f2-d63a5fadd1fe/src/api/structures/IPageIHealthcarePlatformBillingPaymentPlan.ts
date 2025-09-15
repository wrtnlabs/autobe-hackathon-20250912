import { IPage } from "./IPage";
import { IHealthcarePlatformBillingPaymentPlan } from "./IHealthcarePlatformBillingPaymentPlan";

export namespace IPageIHealthcarePlatformBillingPaymentPlan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingPaymentPlan.ISummary[];
  };
}
