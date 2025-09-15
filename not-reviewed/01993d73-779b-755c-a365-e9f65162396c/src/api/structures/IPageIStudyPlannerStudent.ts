import { IPage } from "./IPage";
import { IStudyPlannerStudent } from "./IStudyPlannerStudent";

export namespace IPageIStudyPlannerStudent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerStudent.ISummary[];
  };
}
