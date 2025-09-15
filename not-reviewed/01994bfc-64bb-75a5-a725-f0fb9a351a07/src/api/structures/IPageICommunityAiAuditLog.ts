import { IPage } from "./IPage";
import { ICommunityAiAuditLog } from "./ICommunityAiAuditLog";

export namespace IPageICommunityAiAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiAuditLog.ISummary[];
  };
}
