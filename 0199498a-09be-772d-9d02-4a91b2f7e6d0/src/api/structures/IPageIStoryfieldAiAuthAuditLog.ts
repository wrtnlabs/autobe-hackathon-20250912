import { IPage } from "./IPage";
import { IStoryfieldAiAuthAuditLog } from "./IStoryfieldAiAuthAuditLog";

export namespace IPageIStoryfieldAiAuthAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiAuthAuditLog.ISummary[];
  };
}
