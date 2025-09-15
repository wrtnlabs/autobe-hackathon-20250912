import { IPage } from "./IPage";
import { IRecipeSharingNutritionFact } from "./IRecipeSharingNutritionFact";

export namespace IPageIRecipeSharingNutritionFact {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingNutritionFact.ISummary[];
  };
}
