import { IPage } from "./IPage";
import { IFlexOfficeRoleAssignment } from "./IFlexOfficeRoleAssignment";

export namespace IPageIFlexOfficeRoleAssignment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeRoleAssignment.ISummary[];
  };
}
