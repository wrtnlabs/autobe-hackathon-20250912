import { IPage } from "./IPage";
import { IFlexOfficeExternalSheet } from "./IFlexOfficeExternalSheet";

export namespace IPageIFlexOfficeExternalSheet {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeExternalSheet.ISummary[];
  };
}
