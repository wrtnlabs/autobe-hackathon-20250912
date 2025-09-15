import { IPage } from "./IPage";
import { IEnterpriseLmsRolePermissions } from "./IEnterpriseLmsRolePermissions";

export namespace IPageIEnterpriseLmsRolePermissions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsRolePermissions.ISummary[];
  };
}
