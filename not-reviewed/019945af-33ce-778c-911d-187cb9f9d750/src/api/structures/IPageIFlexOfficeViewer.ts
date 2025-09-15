import { IPage } from "./IPage";
import { IFlexOfficeViewer } from "./IFlexOfficeViewer";

export namespace IPageIFlexOfficeViewer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeViewer.ISummary[];
  };
}
