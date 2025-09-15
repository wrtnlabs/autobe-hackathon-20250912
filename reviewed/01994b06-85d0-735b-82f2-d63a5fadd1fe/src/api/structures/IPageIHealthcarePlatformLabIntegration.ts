import { IPage } from "./IPage";
import { IHealthcarePlatformLabIntegration } from "./IHealthcarePlatformLabIntegration";

export namespace IPageIHealthcarePlatformLabIntegration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformLabIntegration.ISummary[];
  };
}
