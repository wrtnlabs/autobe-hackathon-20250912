import { IPage } from "./IPage";
import { IChatbotChatbotAuditLogs } from "./IChatbotChatbotAuditLogs";

export namespace IPageIChatbotChatbotAuditLogs {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotChatbotAuditLogs.ISummary[];
  };
}
