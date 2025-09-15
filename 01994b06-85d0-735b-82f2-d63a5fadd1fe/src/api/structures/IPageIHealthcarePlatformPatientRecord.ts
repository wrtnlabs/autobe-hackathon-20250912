import { IPage } from "./IPage";
import { IHealthcarePlatformPatientRecord } from "./IHealthcarePlatformPatientRecord";

export namespace IPageIHealthcarePlatformPatientRecord {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformPatientRecord.ISummary[];
  };
}
