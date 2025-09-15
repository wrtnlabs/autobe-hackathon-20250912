import { IPage } from "./IPage";
import { IFlexOfficeTheme } from "./IFlexOfficeTheme";

export namespace IPageIFlexOfficeTheme {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeTheme.ISummary[];
  };
}
