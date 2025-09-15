import { IPage } from "./IPage";
import { IEnterpriseLmsCertification } from "./IEnterpriseLmsCertification";

export namespace IPageIEnterpriseLmsCertification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsCertification.ISummary[];
  };
}
