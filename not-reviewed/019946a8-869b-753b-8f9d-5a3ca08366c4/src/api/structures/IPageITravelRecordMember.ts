import { IPage } from "./IPage";
import { ITravelRecordMember } from "./ITravelRecordMember";

export namespace IPageITravelRecordMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordMember.ISummary[];
  };
}
