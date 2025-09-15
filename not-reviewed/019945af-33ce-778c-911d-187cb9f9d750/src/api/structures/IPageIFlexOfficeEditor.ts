import { IPage } from "./IPage";
import { IFlexOfficeEditor } from "./IFlexOfficeEditor";

export namespace IPageIFlexOfficeEditor {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeEditor.ISummary[];
  };
}
