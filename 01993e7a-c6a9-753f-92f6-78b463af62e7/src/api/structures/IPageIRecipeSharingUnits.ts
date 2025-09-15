import { IPage } from "./IPage";
import { IRecipeSharingUnits } from "./IRecipeSharingUnits";

export namespace IPageIRecipeSharingUnits {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingUnits.ISummary[];
  };
}
