import { IPage } from "./IPage";
import { IEnterpriseLmsEnrollmentPrerequisite } from "./IEnterpriseLmsEnrollmentPrerequisite";

export namespace IPageIEnterpriseLmsEnrollmentPrerequisite {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsEnrollmentPrerequisite.ISummary[];
  };
}
