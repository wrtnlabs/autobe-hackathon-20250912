import { IPage } from "./IPage";
import { IAtsRecruitmentNotificationTemplate } from "./IAtsRecruitmentNotificationTemplate";

export namespace IPageIAtsRecruitmentNotificationTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentNotificationTemplate.ISummary[];
  };
}
