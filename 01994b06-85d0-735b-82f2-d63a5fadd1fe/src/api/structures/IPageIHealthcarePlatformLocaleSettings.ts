import { IPage } from "./IPage";
import { IHealthcarePlatformLocaleSettings } from "./IHealthcarePlatformLocaleSettings";

export namespace IPageIHealthcarePlatformLocaleSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformLocaleSettings.ISummary[];
  };
}
