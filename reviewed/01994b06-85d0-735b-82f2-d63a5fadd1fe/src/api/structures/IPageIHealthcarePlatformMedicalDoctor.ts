import { IPage } from "./IPage";
import { IHealthcarePlatformMedicalDoctor } from "./IHealthcarePlatformMedicalDoctor";

export namespace IPageIHealthcarePlatformMedicalDoctor {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformMedicalDoctor.ISummary[];
  };
}
