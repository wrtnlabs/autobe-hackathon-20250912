import { IPage } from "./IPage";
import { IEnterpriseLmsContentTag } from "./IEnterpriseLmsContentTag";

export namespace IPageIEnterpriseLmsContentTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContentTag.ISummary[];
  };
}
