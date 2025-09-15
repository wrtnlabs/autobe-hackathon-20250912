import { IPage } from "./IPage";
import { IChatAppMessage } from "./IChatAppMessage";

export namespace IPageIChatAppMessage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatAppMessage.ISummary[];
  };
}
