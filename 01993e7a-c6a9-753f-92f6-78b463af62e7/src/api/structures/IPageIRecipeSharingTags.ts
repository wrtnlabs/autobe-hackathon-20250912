import { IPage } from "./IPage";
import { IRecipeSharingTags } from "./IRecipeSharingTags";

export namespace IPageIRecipeSharingTags {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingTags.ISummary[];
  };
}
