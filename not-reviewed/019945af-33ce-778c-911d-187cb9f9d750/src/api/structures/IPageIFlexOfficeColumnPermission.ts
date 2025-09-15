import { IPage } from "./IPage";
import { IFlexOfficeColumnPermission } from "./IFlexOfficeColumnPermission";

export namespace IPageIFlexOfficeColumnPermission {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeColumnPermission.ISummary[];
  };
}
