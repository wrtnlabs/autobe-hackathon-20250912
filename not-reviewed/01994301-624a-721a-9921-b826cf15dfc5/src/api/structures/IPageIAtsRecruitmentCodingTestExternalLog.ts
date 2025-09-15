import { IPage } from "./IPage";
import { IAtsRecruitmentCodingTestExternalLog } from "./IAtsRecruitmentCodingTestExternalLog";

export namespace IPageIAtsRecruitmentCodingTestExternalLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentCodingTestExternalLog.ISummary[];
  };
}
