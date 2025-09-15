import { IPage } from "./IPage";
import { IJobPerformanceEvalEmployees } from "./IJobPerformanceEvalEmployees";

export namespace IPageIJobPerformanceEvalEmployees {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalEmployees.ISummary[];
  };
}
