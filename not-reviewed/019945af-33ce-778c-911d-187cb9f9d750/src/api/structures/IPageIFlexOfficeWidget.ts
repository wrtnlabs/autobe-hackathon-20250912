import { IPage } from "./IPage";
import { IFlexOfficeWidget } from "./IFlexOfficeWidget";

export namespace IPageIFlexOfficeWidget {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeWidget.ISummary[];
  };
}
