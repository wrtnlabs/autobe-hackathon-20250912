import { IPage } from "./IPage";
import { IHealthcarePlatformOrgDepartmentAssignment } from "./IHealthcarePlatformOrgDepartmentAssignment";

export namespace IPageIHealthcarePlatformOrgDepartmentAssignment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformOrgDepartmentAssignment.ISummary[];
  };
}
