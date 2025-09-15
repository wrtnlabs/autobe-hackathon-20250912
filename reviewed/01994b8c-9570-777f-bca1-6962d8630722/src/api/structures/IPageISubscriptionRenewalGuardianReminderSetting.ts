import { IPage } from "./IPage";
import { ISubscriptionRenewalGuardianReminderSetting } from "./ISubscriptionRenewalGuardianReminderSetting";

export namespace IPageISubscriptionRenewalGuardianReminderSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISubscriptionRenewalGuardianReminderSetting.ISummary[];
  };
}
