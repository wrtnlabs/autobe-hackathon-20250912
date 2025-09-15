import { IPage } from "./IPage";
import { IStudyPlannerSubjectCategories } from "./IStudyPlannerSubjectCategories";

export namespace IPageIStudyPlannerSubjectCategories {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerSubjectCategories.ISummary[];
  };
}
