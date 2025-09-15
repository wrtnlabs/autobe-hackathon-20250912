import { IPage } from "./IPage";
import { IChatbotRoomTuples } from "./IChatbotRoomTuples";

export namespace IPageIChatbotRoomTuples {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotRoomTuples.ISummary[];
  };
}
