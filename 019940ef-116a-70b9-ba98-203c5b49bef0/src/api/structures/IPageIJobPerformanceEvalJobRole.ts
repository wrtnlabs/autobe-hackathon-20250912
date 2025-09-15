import { IPage } from "./IPage";
import { IJobPerformanceEvalJobRole } from "./IJobPerformanceEvalJobRole";

export namespace IPageIJobPerformanceEvalJobRole {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalJobRole.ISummary[];
  };
}
