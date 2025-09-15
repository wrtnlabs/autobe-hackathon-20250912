import { IPage } from "./IPage";
import { IStoryfieldAiTokenSession } from "./IStoryfieldAiTokenSession";

export namespace IPageIStoryfieldAiTokenSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiTokenSession.ISummary[];
  };
}
