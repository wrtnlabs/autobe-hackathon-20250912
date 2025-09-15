import { IPage } from "./IPage";
import { IAtsRecruitmentApplicationFeedback } from "./IAtsRecruitmentApplicationFeedback";

export namespace IPageIAtsRecruitmentApplicationFeedback {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentApplicationFeedback.ISummary[];
  };
}
