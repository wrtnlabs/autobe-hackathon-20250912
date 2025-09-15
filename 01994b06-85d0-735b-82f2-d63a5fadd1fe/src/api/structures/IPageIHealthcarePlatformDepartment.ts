import { IPage } from "./IPage";
import { IHealthcarePlatformDepartment } from "./IHealthcarePlatformDepartment";

export namespace IPageIHealthcarePlatformDepartment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformDepartment.ISummary[];
  };
}
