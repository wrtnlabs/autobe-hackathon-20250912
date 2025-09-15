import { IPage } from "./IPage";
import { IChatbotMember } from "./IChatbotMember";

export namespace IPageIChatbotMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotMember.ISummary[];
  };
}
