import { IPage } from "./IPage";
import { IJobPerformanceEvalTaskGroup } from "./IJobPerformanceEvalTaskGroup";

export namespace IPageIJobPerformanceEvalTaskGroup {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalTaskGroup.ISummary[];
  };
}
