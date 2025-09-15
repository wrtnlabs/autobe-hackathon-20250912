import { IPage } from "./IPage";
import { ITravelRecordPlacePhoto } from "./ITravelRecordPlacePhoto";

export namespace IPageITravelRecordPlacePhoto {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITravelRecordPlacePhoto.ISummary[];
  };
}
