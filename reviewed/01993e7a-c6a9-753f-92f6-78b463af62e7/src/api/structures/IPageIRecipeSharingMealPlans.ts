import { IPage } from "./IPage";
import { IRecipeSharingMealPlans } from "./IRecipeSharingMealPlans";

export namespace IPageIRecipeSharingMealPlans {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingMealPlans.ISummary[];
  };
}
