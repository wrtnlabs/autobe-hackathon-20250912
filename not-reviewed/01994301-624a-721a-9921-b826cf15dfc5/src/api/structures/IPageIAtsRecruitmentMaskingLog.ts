import { IPage } from "./IPage";
import { IAtsRecruitmentMaskingLog } from "./IAtsRecruitmentMaskingLog";

export namespace IPageIAtsRecruitmentMaskingLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentMaskingLog.ISummary[];
  };
}
