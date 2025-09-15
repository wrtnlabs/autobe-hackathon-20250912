import { IPage } from "./IPage";
import { IFlexOfficeAdmin } from "./IFlexOfficeAdmin";

export namespace IPageIFlexOfficeAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeAdmin.ISummary[];
  };
}
