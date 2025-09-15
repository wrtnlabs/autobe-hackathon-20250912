import { IPage } from "./IPage";
import { IJobPerformanceEvalEvaluationSnapshots } from "./IJobPerformanceEvalEvaluationSnapshots";

export namespace IPageIJobPerformanceEvalEvaluationSnapshots {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalEvaluationSnapshots.ISummary[];
  };
}
