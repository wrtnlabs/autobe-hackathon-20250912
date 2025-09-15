import { IPage } from "./IPage";
import { IHealthcarePlatformComplianceAgreement } from "./IHealthcarePlatformComplianceAgreement";

export namespace IPageIHealthcarePlatformComplianceAgreement {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformComplianceAgreement.ISummary[];
  };
}
