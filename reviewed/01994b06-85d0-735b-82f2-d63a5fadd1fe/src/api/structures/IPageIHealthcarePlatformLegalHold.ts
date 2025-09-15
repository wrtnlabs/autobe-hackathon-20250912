import { IPage } from "./IPage";
import { IHealthcarePlatformLegalHold } from "./IHealthcarePlatformLegalHold";

export namespace IPageIHealthcarePlatformLegalHold {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformLegalHold.ISummary[];
  };
}
