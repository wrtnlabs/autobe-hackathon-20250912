import { IPage } from "./IPage";
import { IFlexOfficeTablePermission } from "./IFlexOfficeTablePermission";

export namespace IPageIFlexOfficeTablePermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeTablePermission.ISummary[];
  };
}
