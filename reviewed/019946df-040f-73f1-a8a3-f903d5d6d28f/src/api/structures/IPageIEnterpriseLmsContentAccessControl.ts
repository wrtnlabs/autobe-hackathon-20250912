import { IPage } from "./IPage";
import { IEnterpriseLmsContentAccessControl } from "./IEnterpriseLmsContentAccessControl";

export namespace IPageIEnterpriseLmsContentAccessControl {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContentAccessControl.ISummary[];
  };
}
