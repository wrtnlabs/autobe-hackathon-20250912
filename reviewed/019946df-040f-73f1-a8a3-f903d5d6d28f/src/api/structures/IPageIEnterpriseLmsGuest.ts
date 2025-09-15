import { IPage } from "./IPage";
import { IEnterpriseLmsGuest } from "./IEnterpriseLmsGuest";

export namespace IPageIEnterpriseLmsGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsGuest.ISummary[];
  };
}
