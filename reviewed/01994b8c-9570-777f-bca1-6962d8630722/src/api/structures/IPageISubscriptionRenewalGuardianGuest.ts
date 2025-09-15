import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianGuest } from "./ISubscriptionRenewalGuardianGuest";

export namespace IPageISubscriptionRenewalGuardianGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianGuest.ISummary[];
  };
}
