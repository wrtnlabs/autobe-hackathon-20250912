import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianAdmin } from "./ISubscriptionRenewalGuardianAdmin";

export namespace IPageISubscriptionRenewalGuardianAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianAdmin.ISummary[];
  };
}
