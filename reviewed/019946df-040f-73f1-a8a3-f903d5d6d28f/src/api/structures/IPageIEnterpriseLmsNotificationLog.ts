import { IPage } from "./IPage";
import { IEnterpriseLmsNotificationLog } from "./IEnterpriseLmsNotificationLog";

export namespace IPageIEnterpriseLmsNotificationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsNotificationLog.ISummary[];
  };
}
