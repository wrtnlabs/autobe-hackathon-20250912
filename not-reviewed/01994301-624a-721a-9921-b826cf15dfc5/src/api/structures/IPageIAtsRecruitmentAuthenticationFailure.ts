import { IPage } from "./IPage";
import { IAtsRecruitmentAuthenticationFailure } from "./IAtsRecruitmentAuthenticationFailure";

export namespace IPageIAtsRecruitmentAuthenticationFailure {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentAuthenticationFailure.ISummary[];
  };
}
