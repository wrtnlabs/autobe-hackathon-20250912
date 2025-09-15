import { IPage } from "./IPage";
import { ITravelRecordReviews } from "./ITravelRecordReviews";

export namespace IPageITravelRecordReviews {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordReviews.ISummary[];
  };
}
