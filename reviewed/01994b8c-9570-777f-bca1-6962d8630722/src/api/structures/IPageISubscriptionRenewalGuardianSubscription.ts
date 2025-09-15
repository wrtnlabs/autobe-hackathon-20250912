import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianSubscription } from "./ISubscriptionRenewalGuardianSubscription";

export namespace IPageISubscriptionRenewalGuardianSubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianSubscription.ISummary[];
  };
}
