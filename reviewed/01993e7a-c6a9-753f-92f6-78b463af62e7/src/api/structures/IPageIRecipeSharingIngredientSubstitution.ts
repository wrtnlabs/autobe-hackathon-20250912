import { IPage } from "./IPage";
import { IRecipeSharingIngredientSubstitution } from "./IRecipeSharingIngredientSubstitution";

export namespace IPageIRecipeSharingIngredientSubstitution {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingIngredientSubstitution.ISummary[];
  };
}
