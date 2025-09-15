import { IPage } from "./IPage";
import { IFlexOfficeDataSourceCredential } from "./IFlexOfficeDataSourceCredential";

export namespace IPageIFlexOfficeDataSourceCredential {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeDataSourceCredential.ISummary[];
  };
}
