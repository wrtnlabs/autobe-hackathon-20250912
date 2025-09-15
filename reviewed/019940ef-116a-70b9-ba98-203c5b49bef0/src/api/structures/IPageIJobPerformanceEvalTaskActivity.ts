import { IPage } from "./IPage";
import { IJobPerformanceEvalTaskActivity } from "./IJobPerformanceEvalTaskActivity";

export namespace IPageIJobPerformanceEvalTaskActivity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalTaskActivity.ISummary[];
  };
}
