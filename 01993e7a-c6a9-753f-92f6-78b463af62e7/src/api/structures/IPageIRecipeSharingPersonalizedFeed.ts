import { IPage } from "./IPage";
import { IRecipeSharingPersonalizedFeed } from "./IRecipeSharingPersonalizedFeed";

export namespace IPageIRecipeSharingPersonalizedFeed {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingPersonalizedFeed.ISummary[];
  };
}
