import { IPage } from "./IPage";
import { IEventRegistrationEventWaitlist } from "./IEventRegistrationEventWaitlist";

export namespace IPageIEventRegistrationEventWaitlist {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationEventWaitlist.ISummary[];
  };
}
