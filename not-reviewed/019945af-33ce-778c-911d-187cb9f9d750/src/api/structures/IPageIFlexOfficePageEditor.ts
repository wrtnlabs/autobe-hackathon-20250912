import { IPage } from "./IPage";
import { IFlexOfficePageEditor } from "./IFlexOfficePageEditor";

export namespace IPageIFlexOfficePageEditor {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficePageEditor.ISummary[];
  };
}
