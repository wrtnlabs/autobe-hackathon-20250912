import { IPage } from "./IPage";
import { IRecipeSharingUserFollower } from "./IRecipeSharingUserFollower";

export namespace IPageIRecipeSharingUserFollower {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingUserFollower.ISummary[];
  };
}
