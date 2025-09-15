import { IPage } from "./IPage";
import { IEventRegistrationRegularUser } from "./IEventRegistrationRegularUser";

export namespace IPageIEventRegistrationRegularUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationRegularUser.ISummary[];
  };
}
