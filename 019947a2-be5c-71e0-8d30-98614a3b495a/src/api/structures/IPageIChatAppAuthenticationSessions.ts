import { IPage } from "./IPage";
import { IChatAppAuthenticationSessions } from "./IChatAppAuthenticationSessions";

export namespace IPageIChatAppAuthenticationSessions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatAppAuthenticationSessions.ISummary[];
  };
}
