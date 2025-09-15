import { IPage } from "./IPage";
import { IHealthcarePlatformBillingDiscountPolicy } from "./IHealthcarePlatformBillingDiscountPolicy";

export namespace IPageIHealthcarePlatformBillingDiscountPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingDiscountPolicy.ISummary[];
  };
}
