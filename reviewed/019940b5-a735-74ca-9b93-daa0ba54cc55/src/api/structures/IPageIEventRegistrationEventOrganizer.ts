import { IPage } from "./IPage";
import { IEventRegistrationEventOrganizer } from "./IEventRegistrationEventOrganizer";

export namespace IPageIEventRegistrationEventOrganizer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationEventOrganizer.ISummary[];
  };
}
