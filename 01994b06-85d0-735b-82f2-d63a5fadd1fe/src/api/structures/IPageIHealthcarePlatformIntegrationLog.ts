import { IPage } from "./IPage";
import { IHealthcarePlatformIntegrationLog } from "./IHealthcarePlatformIntegrationLog";

export namespace IPageIHealthcarePlatformIntegrationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformIntegrationLog.ISummary[];
  };
}
