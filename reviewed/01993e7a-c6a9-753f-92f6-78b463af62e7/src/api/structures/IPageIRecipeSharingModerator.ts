import { IPage } from "./IPage";
import { IRecipeSharingModerator } from "./IRecipeSharingModerator";

export namespace IPageIRecipeSharingModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingModerator.ISummary[];
  };
}
