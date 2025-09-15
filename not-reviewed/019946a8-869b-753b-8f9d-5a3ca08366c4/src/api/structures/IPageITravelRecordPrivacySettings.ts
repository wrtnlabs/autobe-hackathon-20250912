import { IPage } from "./IPage";
import { ITravelRecordPrivacySettings } from "./ITravelRecordPrivacySettings";

export namespace IPageITravelRecordPrivacySettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordPrivacySettings.ISummary[];
  };
}
