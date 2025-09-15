import { IPage } from "./IPage";
import { IJobPerformanceEvalSelfEvaluation } from "./IJobPerformanceEvalSelfEvaluation";

export namespace IPageIJobPerformanceEvalSelfEvaluation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalSelfEvaluation.ISummary[];
  };
}
