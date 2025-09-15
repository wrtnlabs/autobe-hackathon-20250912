import { IPage } from "./IPage";
import { IEnterpriseLmsVirtualClassroom } from "./IEnterpriseLmsVirtualClassroom";

export namespace IPageIEnterpriseLmsVirtualClassroom {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsVirtualClassroom.ISummary[];
  };
}
