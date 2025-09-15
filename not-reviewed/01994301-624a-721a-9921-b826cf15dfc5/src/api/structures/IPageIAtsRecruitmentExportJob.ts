import { IPage } from "./IPage";
import { IAtsRecruitmentExportJob } from "./IAtsRecruitmentExportJob";

export namespace IPageIAtsRecruitmentExportJob {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentExportJob.ISummary[];
  };
}
