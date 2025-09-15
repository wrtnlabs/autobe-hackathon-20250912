import { IPage } from "./IPage";
import { IHealthcarePlatformBenchmarkDefinition } from "./IHealthcarePlatformBenchmarkDefinition";

export namespace IPageIHealthcarePlatformBenchmarkDefinition {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformBenchmarkDefinition.ISummary[];
  };
}
