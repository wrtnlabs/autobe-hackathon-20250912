import { IPage } from "./IPage";
import { IRecipeSharingUserTags } from "./IRecipeSharingUserTags";

export namespace IPageIRecipeSharingUserTags {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingUserTags.ISummary[];
  };
}
