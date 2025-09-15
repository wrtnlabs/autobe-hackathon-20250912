import { IPage } from "./IPage";
import { IEnterpriseLmsCertificateIssuance } from "./IEnterpriseLmsCertificateIssuance";

export namespace IPageIEnterpriseLmsCertificateIssuance {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsCertificateIssuance.ISummary[];
  };
}
