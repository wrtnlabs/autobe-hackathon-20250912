import { IPage } from "./IPage";
import { IFlexOfficeCustomScript } from "./IFlexOfficeCustomScript";

export namespace IPageIFlexOfficeCustomScript {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeCustomScript.ISummary[];
  };
}
