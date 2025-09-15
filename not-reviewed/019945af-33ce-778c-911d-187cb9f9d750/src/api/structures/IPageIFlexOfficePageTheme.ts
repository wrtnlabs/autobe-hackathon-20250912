import { IPage } from "./IPage";
import { IFlexOfficePageTheme } from "./IFlexOfficePageTheme";

export namespace IPageIFlexOfficePageTheme {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficePageTheme.ISummary[];
  };
}
