import { IPage } from "./IPage";
import { IChatbotUserTitle } from "./IChatbotUserTitle";

export namespace IPageIChatbotUserTitle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotUserTitle.ISummary[];
  };
}
