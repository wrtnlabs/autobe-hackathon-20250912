import { IPage } from "./IPage";
import { IStudyPlannerGeneralReminder } from "./IStudyPlannerGeneralReminder";

export namespace IPageIStudyPlannerGeneralReminder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerGeneralReminder.ISummary[];
  };
}
