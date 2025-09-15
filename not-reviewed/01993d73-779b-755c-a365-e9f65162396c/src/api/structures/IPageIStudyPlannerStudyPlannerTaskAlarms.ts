import { IPage } from "./IPage";
import { IStudyPlannerStudyPlannerTaskAlarms } from "./IStudyPlannerStudyPlannerTaskAlarms";

export namespace IPageIStudyPlannerStudyPlannerTaskAlarms {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerStudyPlannerTaskAlarms.ISummary[];
  };
}
