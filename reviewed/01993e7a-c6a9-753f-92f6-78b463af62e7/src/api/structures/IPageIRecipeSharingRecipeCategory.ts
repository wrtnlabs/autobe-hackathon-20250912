import { IPage } from "./IPage";
import { IRecipeSharingRecipeCategory } from "./IRecipeSharingRecipeCategory";

export namespace IPageIRecipeSharingRecipeCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingRecipeCategory.ISummary[];
  };
}
