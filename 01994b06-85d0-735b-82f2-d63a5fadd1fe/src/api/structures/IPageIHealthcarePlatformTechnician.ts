import { IPage } from "./IPage";
import { IHealthcarePlatformTechnician } from "./IHealthcarePlatformTechnician";

export namespace IPageIHealthcarePlatformTechnician {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformTechnician.ISummary[];
  };
}
