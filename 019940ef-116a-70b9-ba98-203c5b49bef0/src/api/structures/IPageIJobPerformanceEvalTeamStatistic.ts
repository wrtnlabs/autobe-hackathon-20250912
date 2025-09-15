import { IPage } from "./IPage";
import { IJobPerformanceEvalTeamStatistic } from "./IJobPerformanceEvalTeamStatistic";

export namespace IPageIJobPerformanceEvalTeamStatistic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IJobPerformanceEvalTeamStatistic.ISummary[];
  };
}
