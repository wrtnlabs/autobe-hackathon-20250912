import { IPage } from "./IPage";
import { IAtsRecruitmentNotificationFailure } from "./IAtsRecruitmentNotificationFailure";

export namespace IPageIAtsRecruitmentNotificationFailure {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentNotificationFailure.ISummary[];
  };
}
