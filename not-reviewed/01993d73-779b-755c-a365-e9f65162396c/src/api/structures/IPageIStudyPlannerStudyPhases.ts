import { IPage } from "./IPage";
import { IStudyPlannerStudyPhases } from "./IStudyPlannerStudyPhases";

export namespace IPageIStudyPlannerStudyPhases {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerStudyPhases.ISummary[];
  };
}
