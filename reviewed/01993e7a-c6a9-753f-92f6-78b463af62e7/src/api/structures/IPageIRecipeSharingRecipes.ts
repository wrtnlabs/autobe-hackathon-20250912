import { IPage } from "./IPage";
import { IRecipeSharingRecipes } from "./IRecipeSharingRecipes";

export namespace IPageIRecipeSharingRecipes {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingRecipes.ISummary[];
  };
}
