import { IPage } from "./IPage";
import { IHealthcarePlatformNotification } from "./IHealthcarePlatformNotification";

export namespace IPageIHealthcarePlatformNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformNotification.ISummary[];
  };
}
