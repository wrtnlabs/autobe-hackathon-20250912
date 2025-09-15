import { IPage } from "./IPage";
import { ILibraryManagementBooks } from "./ILibraryManagementBooks";

export namespace IPageILibraryManagementBooks {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ILibraryManagementBooks.ISummary[];
  };
}
