import { IPage } from "./IPage";
import { IAtsRecruitmentNotification } from "./IAtsRecruitmentNotification";

export namespace IPageIAtsRecruitmentNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentNotification.ISummary[];
  };
}
