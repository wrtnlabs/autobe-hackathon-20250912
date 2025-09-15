import { IPage } from "./IPage";
import { IStoryfieldAiTtsResult } from "./IStoryfieldAiTtsResult";

export namespace IPageIStoryfieldAiTtsResult {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiTtsResult.ISummary[];
  };
}
