import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianSubscriptions } from "./ISubscriptionRenewalGuardianSubscriptions";

export namespace IPageISubscriptionRenewalGuardianSubscriptions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianSubscriptions.ISummary[];
  };
}
