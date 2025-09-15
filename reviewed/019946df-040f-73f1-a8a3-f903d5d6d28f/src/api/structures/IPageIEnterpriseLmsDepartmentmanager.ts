import { IPage } from "./IPage";
import { IEnterpriseLmsDepartmentManager } from "./IEnterpriseLmsDepartmentManager";

export namespace IPageIEnterpriseLmsDepartmentmanager {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsDepartmentManager.ISummary[];
  };
}
