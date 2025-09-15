import { IPage } from "./IPage";
import { IAtsRecruitmentSystemAdmin } from "./IAtsRecruitmentSystemAdmin";

export namespace IPageIAtsRecruitmentSystemAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentSystemAdmin.ISummary[];
  };
}
