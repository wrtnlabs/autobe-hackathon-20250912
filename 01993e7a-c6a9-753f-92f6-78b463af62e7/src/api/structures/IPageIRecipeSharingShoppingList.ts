import { IPage } from "./IPage";
import { IRecipeSharingShoppingList } from "./IRecipeSharingShoppingList";

export namespace IPageIRecipeSharingShoppingList {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingShoppingList.ISummary[];
  };
}
