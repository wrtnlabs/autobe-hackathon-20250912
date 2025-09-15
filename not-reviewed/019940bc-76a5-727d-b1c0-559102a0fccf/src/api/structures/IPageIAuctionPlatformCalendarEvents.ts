import { IPage } from "./IPage";
import { IAuctionPlatformCalendarEvents } from "./IAuctionPlatformCalendarEvents";

export namespace IPageIAuctionPlatformCalendarEvents {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformCalendarEvents.ISummary[];
  };
}
