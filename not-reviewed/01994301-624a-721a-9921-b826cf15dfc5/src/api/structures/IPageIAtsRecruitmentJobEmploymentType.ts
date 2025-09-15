import { IPage } from "./IPage";
import { IAtsRecruitmentJobEmploymentType } from "./IAtsRecruitmentJobEmploymentType";

export namespace IPageIAtsRecruitmentJobEmploymentType {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentJobEmploymentType.ISummary[];
  };
}
