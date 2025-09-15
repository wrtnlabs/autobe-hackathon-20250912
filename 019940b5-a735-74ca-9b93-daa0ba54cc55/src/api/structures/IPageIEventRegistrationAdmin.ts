import { IPage } from "./IPage";
import { IEventRegistrationAdmin } from "./IEventRegistrationAdmin";

export namespace IPageIEventRegistrationAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEventRegistrationAdmin.ISummary[];
  };
}
