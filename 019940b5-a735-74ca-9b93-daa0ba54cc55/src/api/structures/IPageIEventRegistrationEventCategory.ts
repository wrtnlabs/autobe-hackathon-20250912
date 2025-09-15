import { IPage } from "./IPage";
import { IEventRegistrationEventCategory } from "./IEventRegistrationEventCategory";

export namespace IPageIEventRegistrationEventCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationEventCategory.ISummary[];
  };
}
