import { IPage } from "./IPage";
import { IHealthcarePlatformSecurityIncident } from "./IHealthcarePlatformSecurityIncident";

export namespace IPageIHealthcarePlatformSecurityIncident {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformSecurityIncident.ISummary[];
  };
}
