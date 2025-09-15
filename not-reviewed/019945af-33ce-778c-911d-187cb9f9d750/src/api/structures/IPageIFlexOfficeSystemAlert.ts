import { IPage } from "./IPage";
import { IFlexOfficeSystemAlert } from "./IFlexOfficeSystemAlert";

export namespace IPageIFlexOfficeSystemAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeSystemAlert.ISummary[];
  };
}
