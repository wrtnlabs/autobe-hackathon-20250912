import { IPage } from "./IPage";
import { IEnterpriseLmsContentTagChild } from "./IEnterpriseLmsContentTagChild";

export namespace IPageIEnterpriseLmsContentTagChild {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContentTagChild.ISummary[];
  };
}
