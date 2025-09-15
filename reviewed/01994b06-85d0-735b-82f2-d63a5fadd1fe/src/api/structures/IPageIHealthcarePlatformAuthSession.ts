import { IPage } from "./IPage";
import { IHealthcarePlatformAuthSession } from "./IHealthcarePlatformAuthSession";

export namespace IPageIHealthcarePlatformAuthSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAuthSession.ISummary[];
  };
}
