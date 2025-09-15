import { IPage } from "./IPage";
import { IAtsRecruitmentTechReviewer } from "./IAtsRecruitmentTechReviewer";

export namespace IPageIAtsRecruitmentTechReviewer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentTechReviewer.ISummary[];
  };
}
