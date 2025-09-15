import { IPage } from "./IPage";
import { IHealthcarePlatformRole } from "./IHealthcarePlatformRole";

export namespace IPageIHealthcarePlatformRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformRole.ISummary[];
  };
}
