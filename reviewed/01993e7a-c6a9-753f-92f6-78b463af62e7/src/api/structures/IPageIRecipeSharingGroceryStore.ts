import { IPage } from "./IPage";
import { IRecipeSharingGroceryStore } from "./IRecipeSharingGroceryStore";

export namespace IPageIRecipeSharingGroceryStore {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingGroceryStore.ISummary[];
  };
}
