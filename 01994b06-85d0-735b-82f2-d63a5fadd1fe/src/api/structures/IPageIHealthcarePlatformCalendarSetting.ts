import { IPage } from "./IPage";
import { IHealthcarePlatformCalendarSetting } from "./IHealthcarePlatformCalendarSetting";

export namespace IPageIHealthcarePlatformCalendarSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformCalendarSetting.ISummary[];
  };
}
