import { IPage } from "./IPage";
import { ITravelRecordTravelRecordAdmin } from "./ITravelRecordTravelRecordAdmin";

export namespace IPageITravelRecordTravelRecordAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordTravelRecordAdmin.ISummary[];
  };
}
