import { IPage } from "./IPage";
import { IJobPerformanceEvalManagerEvaluation } from "./IJobPerformanceEvalManagerEvaluation";

export namespace IPageIJobPerformanceEvalManagerEvaluation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalManagerEvaluation.ISummary[];
  };
}
