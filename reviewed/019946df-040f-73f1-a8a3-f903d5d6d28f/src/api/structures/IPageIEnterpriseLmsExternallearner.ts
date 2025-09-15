import { IPage } from "./IPage";
import { IEnterpriseLmsExternalLearner } from "./IEnterpriseLmsExternalLearner";

export namespace IPageIEnterpriseLmsExternallearner {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsExternalLearner.ISummary[];
  };
}
