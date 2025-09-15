import { IPage } from "./IPage";
import { IEnterpriseLmsContents } from "./IEnterpriseLmsContents";

export namespace IPageIEnterpriseLmsContents {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContents.ISummary[];
  };
}
