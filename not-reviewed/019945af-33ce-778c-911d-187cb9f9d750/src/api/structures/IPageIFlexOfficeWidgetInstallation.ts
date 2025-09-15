import { IPage } from "./IPage";
import { IFlexOfficeWidgetInstallation } from "./IFlexOfficeWidgetInstallation";

export namespace IPageIFlexOfficeWidgetInstallation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeWidgetInstallation.ISummary[];
  };
}
