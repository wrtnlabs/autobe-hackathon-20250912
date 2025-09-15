import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianVendors } from "./ISubscriptionRenewalGuardianVendors";

export namespace IPageISubscriptionRenewalGuardianVendors {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianVendors.ISummary[];
  };
}
