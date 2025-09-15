import { IPage } from "./IPage";
import { IRecipeSharingReview } from "./IRecipeSharingReview";

export namespace IPageIRecipeSharingReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingReview.ISummary[];
  };
}
