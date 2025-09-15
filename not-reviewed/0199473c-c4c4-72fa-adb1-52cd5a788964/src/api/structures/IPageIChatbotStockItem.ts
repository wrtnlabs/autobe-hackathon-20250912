import { IPage } from "./IPage";
import { IChatbotStockItem } from "./IChatbotStockItem";

export namespace IPageIChatbotStockItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotStockItem.ISummary[];
  };
}
