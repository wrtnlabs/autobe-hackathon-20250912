import { IPage } from "./IPage";
import { IAtsRecruitmentJobPosting } from "./IAtsRecruitmentJobPosting";

export namespace IPageIAtsRecruitmentJobPosting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentJobPosting.ISummary[];
  };
}
