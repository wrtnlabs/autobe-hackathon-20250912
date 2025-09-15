import { IPage } from "./IPage";
import { IFlexOfficeSystemSettings } from "./IFlexOfficeSystemSettings";

export namespace IPageIFlexOfficeSystemSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeSystemSettings.ISummary[];
  };
}
