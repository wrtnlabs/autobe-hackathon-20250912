import { IPage } from "./IPage";
import { IJobPerformanceEvalManagerComments } from "./IJobPerformanceEvalManagerComments";

export namespace IPageIJobPerformanceEvalManagerComments {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalManagerComments.ISummary[];
  };
}
