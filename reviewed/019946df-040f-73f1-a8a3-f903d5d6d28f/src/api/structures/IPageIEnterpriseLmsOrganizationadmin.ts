import { IPage } from "./IPage";
import { IEnterpriseLmsOrganizationAdmin } from "./IEnterpriseLmsOrganizationAdmin";

export namespace IPageIEnterpriseLmsOrganizationadmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsOrganizationAdmin.ISummary[];
  };
}
