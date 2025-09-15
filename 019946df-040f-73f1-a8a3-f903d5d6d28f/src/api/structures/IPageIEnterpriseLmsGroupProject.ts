import { IPage } from "./IPage";
import { IEnterpriseLmsGroupProject } from "./IEnterpriseLmsGroupProject";

export namespace IPageIEnterpriseLmsGroupProject {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsGroupProject.ISummary[];
  };
}
