import { IPage } from "./IPage";
import { IEnterpriseLmsEnrollment } from "./IEnterpriseLmsEnrollment";

export namespace IPageIEnterpriseLmsEnrollment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsEnrollment.ISummary[];
  };
}
