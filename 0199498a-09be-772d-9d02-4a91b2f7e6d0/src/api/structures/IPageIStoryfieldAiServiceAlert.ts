import { IPage } from "./IPage";
import { IStoryfieldAiServiceAlert } from "./IStoryfieldAiServiceAlert";

export namespace IPageIStoryfieldAiServiceAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiServiceAlert.ISummary[];
  };
}
