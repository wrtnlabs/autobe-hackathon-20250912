import { IPage } from "./IPage";
import { IHealthcarePlatformEhrEncounter } from "./IHealthcarePlatformEhrEncounter";

export namespace IPageIHealthcarePlatformEhrEncounter {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformEhrEncounter.ISummary[];
  };
}
