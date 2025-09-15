import { IPage } from "./IPage";
import { IFlexOfficeDataSource } from "./IFlexOfficeDataSource";

export namespace IPageIFlexOfficeDataSource {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeDataSource.ISummary[];
  };
}
