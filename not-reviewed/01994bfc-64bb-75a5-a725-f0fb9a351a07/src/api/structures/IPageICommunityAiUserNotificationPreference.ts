import { IPage } from "./IPage";
import { ICommunityAiUserNotificationPreference } from "./ICommunityAiUserNotificationPreference";

export namespace IPageICommunityAiUserNotificationPreference {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiUserNotificationPreference.ISummary[];
  };
}
