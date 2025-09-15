import { IPage } from "./IPage";
import { IAtsRecruitmentJobPostingState } from "./IAtsRecruitmentJobPostingState";

export namespace IPageIAtsRecruitmentJobPostingState {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentJobPostingState.ISummary[];
  };
}
