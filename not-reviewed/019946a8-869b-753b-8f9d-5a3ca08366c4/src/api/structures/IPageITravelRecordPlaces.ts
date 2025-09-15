import { IPage } from "./IPage";
import { ITravelRecordPlaces } from "./ITravelRecordPlaces";

export namespace IPageITravelRecordPlaces {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordPlaces.ISummary[];
  };
}
