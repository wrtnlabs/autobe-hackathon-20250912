import { IPage } from "./IPage";
import { IEventRegistrationEventAnalytics } from "./IEventRegistrationEventAnalytics";

export namespace IPageIEventRegistrationEventAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationEventAnalytics.ISummary[];
  };
}
