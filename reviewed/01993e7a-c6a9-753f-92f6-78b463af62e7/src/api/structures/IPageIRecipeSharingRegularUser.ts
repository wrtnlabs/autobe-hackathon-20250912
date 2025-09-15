import { IPage } from "./IPage";
import { IRecipeSharingRegularUser } from "./IRecipeSharingRegularUser";

export namespace IPageIRecipeSharingRegularUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRecipeSharingRegularUser.ISummary[];
  };
}
