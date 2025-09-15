import { IPage } from "./IPage";
import { ITravelRecordFriend } from "./ITravelRecordFriend";

export namespace IPageITravelRecordFriend {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordFriend.ISummary[];
  };
}
