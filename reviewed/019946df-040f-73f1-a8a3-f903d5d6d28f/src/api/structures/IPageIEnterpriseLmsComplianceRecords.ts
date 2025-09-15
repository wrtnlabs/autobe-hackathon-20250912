import { IPage } from "./IPage";
import { IEnterpriseLmsComplianceRecords } from "./IEnterpriseLmsComplianceRecords";

export namespace IPageIEnterpriseLmsComplianceRecords {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsComplianceRecords.ISummary[];
  };
}
