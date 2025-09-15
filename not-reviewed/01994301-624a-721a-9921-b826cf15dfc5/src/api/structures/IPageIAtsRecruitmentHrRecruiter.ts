import { IPage } from "./IPage";
import { IAtsRecruitmentHrRecruiter } from "./IAtsRecruitmentHrRecruiter";

export namespace IPageIAtsRecruitmentHrRecruiter {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentHrRecruiter.ISummary[];
  };
}
