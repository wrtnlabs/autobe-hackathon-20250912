import { IPage } from "./IPage";
import { IEnterpriseLmsCorporateLearner } from "./IEnterpriseLmsCorporateLearner";

export namespace IPageIEnterpriseLmsCorporatelearner {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsCorporateLearner.ISummary[];
  };
}
