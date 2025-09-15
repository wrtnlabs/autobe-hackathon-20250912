import { IPage } from "./IPage";
import { IEventRegistrationNotification } from "./IEventRegistrationNotification";

export namespace IPageIEventRegistrationNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationNotification.ISummary[];
  };
}
