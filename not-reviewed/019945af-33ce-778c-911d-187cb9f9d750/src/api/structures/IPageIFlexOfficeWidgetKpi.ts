import { IPage } from "./IPage";
import { IFlexOfficeWidgetKpi } from "./IFlexOfficeWidgetKpi";

export namespace IPageIFlexOfficeWidgetKpi {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeWidgetKpi.ISummary[];
  };
}
