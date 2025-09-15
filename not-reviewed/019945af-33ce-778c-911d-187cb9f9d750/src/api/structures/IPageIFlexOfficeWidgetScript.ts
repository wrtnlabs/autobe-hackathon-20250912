import { IPage } from "./IPage";
import { IFlexOfficeWidgetScript } from "./IFlexOfficeWidgetScript";

export namespace IPageIFlexOfficeWidgetScript {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeWidgetScript.ISummary[];
  };
}
