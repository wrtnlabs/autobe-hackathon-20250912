import { IPage } from "./IPage";
import { IFlexOfficeRowPermission } from "./IFlexOfficeRowPermission";

export namespace IPageIFlexOfficeRowPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeRowPermission.ISummary[];
  };
}
