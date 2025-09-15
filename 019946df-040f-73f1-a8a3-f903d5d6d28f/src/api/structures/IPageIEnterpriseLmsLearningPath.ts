import { IPage } from "./IPage";
import { IEnterpriseLmsLearningPath } from "./IEnterpriseLmsLearningPath";

export namespace IPageIEnterpriseLmsLearningPath {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsLearningPath.ISummary[];
  };
}
