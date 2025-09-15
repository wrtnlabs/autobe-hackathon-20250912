import { IPage } from "./IPage";
import { IStoryfieldAiStoryPage } from "./IStoryfieldAiStoryPage";

export namespace IPageIStoryfieldAiStoryPage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiStoryPage.ISummary[];
  };
}
