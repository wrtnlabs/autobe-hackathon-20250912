import { IPage } from "./IPage";
import { IChatbotCommandLog } from "./IChatbotCommandLog";

export namespace IPageIChatbotCommandLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotCommandLog.ISummary[];
  };
}
