import { IPage } from "./IPage";
import { IJobPerformanceEvalManager } from "./IJobPerformanceEvalManager";

export namespace IPageIJobPerformanceEvalManager {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalManager.ISummary[];
  };
}
