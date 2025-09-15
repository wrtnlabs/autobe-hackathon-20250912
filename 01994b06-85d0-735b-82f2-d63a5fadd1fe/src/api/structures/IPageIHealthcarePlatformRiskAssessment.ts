import { IPage } from "./IPage";
import { IHealthcarePlatformRiskAssessment } from "./IHealthcarePlatformRiskAssessment";

export namespace IPageIHealthcarePlatformRiskAssessment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformRiskAssessment.ISummary[];
  };
}
