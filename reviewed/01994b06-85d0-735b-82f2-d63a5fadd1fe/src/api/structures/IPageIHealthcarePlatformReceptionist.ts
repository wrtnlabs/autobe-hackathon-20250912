import { IPage } from "./IPage";
import { IHealthcarePlatformReceptionist } from "./IHealthcarePlatformReceptionist";

export namespace IPageIHealthcarePlatformReceptionist {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformReceptionist.ISummary[];
  };
}
