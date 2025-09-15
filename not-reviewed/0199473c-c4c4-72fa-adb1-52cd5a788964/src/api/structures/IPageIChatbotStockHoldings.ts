import { IPage } from "./IPage";
import { IChatbotStockHoldings } from "./IChatbotStockHoldings";

export namespace IPageIChatbotStockHoldings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotStockHoldings.ISummary[];
  };
}
