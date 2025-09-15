import { IPage } from "./IPage";
import { IHealthcarePlatformTelemedicineSessions } from "./IHealthcarePlatformTelemedicineSessions";

export namespace IPageIHealthcarePlatformTelemedicineSessions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformTelemedicineSessions.ISummary[];
  };
}
