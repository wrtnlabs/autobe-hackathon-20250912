import { IPage } from "./IPage";
import { IHealthcarePlatformRoomReservation } from "./IHealthcarePlatformRoomReservation";

export namespace IPageIHealthcarePlatformRoomReservation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformRoomReservation.ISummary[];
  };
}
