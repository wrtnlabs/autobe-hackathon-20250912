import { IPage } from "./IPage";
import { IEnterpriseLmsCertificationExpiration } from "./IEnterpriseLmsCertificationExpiration";

export namespace IPageIEnterpriseLmsCertificationExpiration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsCertificationExpiration.ISummary[];
  };
}
