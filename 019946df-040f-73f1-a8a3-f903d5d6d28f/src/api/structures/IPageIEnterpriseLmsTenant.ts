import { IPage } from "./IPage";
import { IEnterpriseLmsTenant } from "./IEnterpriseLmsTenant";

export namespace IPageIEnterpriseLmsTenant {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsTenant.ISummary[];
  };
}
