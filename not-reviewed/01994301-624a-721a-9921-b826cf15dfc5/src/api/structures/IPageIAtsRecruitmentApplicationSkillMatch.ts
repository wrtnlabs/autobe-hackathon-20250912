import { IPage } from "./IPage";
import { IAtsRecruitmentApplicationSkillMatch } from "./IAtsRecruitmentApplicationSkillMatch";

export namespace IPageIAtsRecruitmentApplicationSkillMatch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentApplicationSkillMatch.ISummary[];
  };
}
