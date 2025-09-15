import { IPage } from "./IPage";
import { IFlexOfficePage } from "./IFlexOfficePage";

export namespace IPageIFlexOfficePage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficePage.ISummary[];
  };
}
