import { IPage } from "./IPage";
import { IRecipeSharingCategoryApprovals } from "./IRecipeSharingCategoryApprovals";

export namespace IPageIRecipeSharingCategoryApprovals {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingCategoryApprovals.ISummary[];
  };
}
