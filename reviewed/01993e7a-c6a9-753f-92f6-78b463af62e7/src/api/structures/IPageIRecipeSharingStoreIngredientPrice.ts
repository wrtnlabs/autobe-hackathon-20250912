import { IPage } from "./IPage";
import { IRecipeSharingStoreIngredientPrice } from "./IRecipeSharingStoreIngredientPrice";

export namespace IPageIRecipeSharingStoreIngredientPrice {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingStoreIngredientPrice.ISummary[];
  };
}
