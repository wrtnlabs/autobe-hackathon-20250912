import { IPage } from "./IPage";
import { IAtsRecruitmentResume } from "./IAtsRecruitmentResume";

export namespace IPageIAtsRecruitmentResume {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentResume.ISummary[];
  };
}
