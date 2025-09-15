import { IPage } from "./IPage";
import { IStudyPlannerStudyTasks } from "./IStudyPlannerStudyTasks";

export namespace IPageIStudyPlannerStudyTasks {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerStudyTasks.ISummary[];
  };
}
