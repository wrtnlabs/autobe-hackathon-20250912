import { IPage } from "./IPage";
import { IEnterpriseLmsBlendedLearningSession } from "./IEnterpriseLmsBlendedLearningSession";

export namespace IPageIEnterpriseLmsBlendedLearningSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsBlendedLearningSession.ISummary[];
  };
}
