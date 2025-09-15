import { IPage } from "./IPage";
import { IChatbotAdmin } from "./IChatbotAdmin";

export namespace IPageIChatbotAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotAdmin.ISummary[];
  };
}
