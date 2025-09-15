import { IPage } from "./IPage";
import { IAtsRecruitmentAccessLog } from "./IAtsRecruitmentAccessLog";

export namespace IPageIAtsRecruitmentAccessLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentAccessLog.ISummary[];
  };
}
