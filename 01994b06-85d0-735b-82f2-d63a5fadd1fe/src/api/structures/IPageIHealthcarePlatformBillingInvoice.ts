import { IPage } from "./IPage";
import { IHealthcarePlatformBillingInvoice } from "./IHealthcarePlatformBillingInvoice";

export namespace IPageIHealthcarePlatformBillingInvoice {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBillingInvoice.ISummary[];
  };
}
