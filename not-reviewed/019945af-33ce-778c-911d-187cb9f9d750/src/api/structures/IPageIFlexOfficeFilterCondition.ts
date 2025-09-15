import { IPage } from "./IPage";
import { IFlexOfficeFilterCondition } from "./IFlexOfficeFilterCondition";

export namespace IPageIFlexOfficeFilterCondition {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeFilterCondition.ISummary[];
  };
}
