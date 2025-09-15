import { IPage } from "./IPage";
import { IHealthcarePlatformPatient } from "./IHealthcarePlatformPatient";

export namespace IPageIHealthcarePlatformPatient {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformPatient.ISummary[];
  };
}
