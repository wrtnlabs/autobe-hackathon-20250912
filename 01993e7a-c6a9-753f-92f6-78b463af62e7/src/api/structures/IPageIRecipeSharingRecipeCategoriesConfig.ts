import { IPage } from "./IPage";
import { IRecipeSharingRecipeCategoriesConfig } from "./IRecipeSharingRecipeCategoriesConfig";

export namespace IPageIRecipeSharingRecipeCategoriesConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingRecipeCategoriesConfig.ISummary[];
  };
}
