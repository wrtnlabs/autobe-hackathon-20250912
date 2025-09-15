import { IPage } from "./IPage";
import { IEnterpriseLmsSession } from "./IEnterpriseLmsSession";

export namespace IPageIEnterpriseLmsSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsSession.ISummary[];
  };
}
