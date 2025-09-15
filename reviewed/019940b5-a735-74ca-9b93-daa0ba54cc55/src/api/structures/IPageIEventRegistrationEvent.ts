import { IPage } from "./IPage";
import { IEventRegistrationEvent } from "./IEventRegistrationEvent";

export namespace IPageIEventRegistrationEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationEvent.ISummary[];
  };
}
