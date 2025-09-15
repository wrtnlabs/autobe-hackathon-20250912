import { IPage } from "./IPage";
import { IStoryfieldAiExternalApiFailure } from "./IStoryfieldAiExternalApiFailure";

export namespace IPageIStoryfieldAiExternalApiFailure {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiExternalApiFailure.ISummary[];
  };
}
