import { IPage } from "./IPage";
import { IFlexOfficePageComment } from "./IFlexOfficePageComment";

export namespace IPageIFlexOfficePageComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficePageComment.ISummary[];
  };
}
