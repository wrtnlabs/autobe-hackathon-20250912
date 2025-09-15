import { IPage } from "./IPage";
import { IRecipeSharingIngredient } from "./IRecipeSharingIngredient";

export namespace IPageIRecipeSharingIngredient {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingIngredient.ISummary[];
  };
}
