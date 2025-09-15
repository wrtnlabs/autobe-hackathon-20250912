import { IPage } from "./IPage";
import { IAtsRecruitmentExportJobDetail } from "./IAtsRecruitmentExportJobDetail";

export namespace IPageIAtsRecruitmentExportJobDetail {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentExportJobDetail.ISummary[];
  };
}
