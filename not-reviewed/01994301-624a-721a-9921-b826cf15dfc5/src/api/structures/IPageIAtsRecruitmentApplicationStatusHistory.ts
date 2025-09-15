import { IPage } from "./IPage";
import { IAtsRecruitmentApplicationStatusHistory } from "./IAtsRecruitmentApplicationStatusHistory";

export namespace IPageIAtsRecruitmentApplicationStatusHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentApplicationStatusHistory.ISummary[];
  };
}
