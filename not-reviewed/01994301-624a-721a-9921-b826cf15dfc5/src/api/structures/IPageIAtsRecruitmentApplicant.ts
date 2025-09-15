import { IPage } from "./IPage";
import { IAtsRecruitmentApplicant } from "./IAtsRecruitmentApplicant";

export namespace IPageIAtsRecruitmentApplicant {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentApplicant.ISummary[];
  };
}
