import { IPage } from "./IPage";
import { IStudyPlannerAttachment } from "./IStudyPlannerAttachment";

export namespace IPageIStudyPlannerAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStudyPlannerAttachment.ISummary[];
  };
}
