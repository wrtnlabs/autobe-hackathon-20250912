import { IPage } from "./IPage";
import { IEnterpriseLmsCompetency } from "./IEnterpriseLmsCompetency";

export namespace IPageIEnterpriseLmsCompetency {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsCompetency.ISummary[];
  };
}
