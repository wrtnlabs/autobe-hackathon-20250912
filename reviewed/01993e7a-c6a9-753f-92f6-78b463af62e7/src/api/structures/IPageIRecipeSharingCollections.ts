import { IPage } from "./IPage";
import { IRecipeSharingCollections } from "./IRecipeSharingCollections";

export namespace IPageIRecipeSharingCollections {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingCollections.ISummary[];
  };
}
