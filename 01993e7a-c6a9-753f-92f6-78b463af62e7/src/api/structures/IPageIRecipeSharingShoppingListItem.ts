import { IPage } from "./IPage";
import { IRecipeSharingShoppingListItem } from "./IRecipeSharingShoppingListItem";

export namespace IPageIRecipeSharingShoppingListItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingShoppingListItem.ISummary[];
  };
}
