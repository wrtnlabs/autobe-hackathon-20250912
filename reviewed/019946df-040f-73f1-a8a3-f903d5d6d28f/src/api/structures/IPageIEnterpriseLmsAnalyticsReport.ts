import { IPage } from "./IPage";
import { IEnterpriseLmsAnalyticsReport } from "./IEnterpriseLmsAnalyticsReport";

export namespace IPageIEnterpriseLmsAnalyticsReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsAnalyticsReport.ISummary[];
  };
}
