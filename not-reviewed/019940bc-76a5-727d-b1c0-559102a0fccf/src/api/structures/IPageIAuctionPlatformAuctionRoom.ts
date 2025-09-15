import { IPage } from "./IPage";
import { IAuctionPlatformAuctionRoom } from "./IAuctionPlatformAuctionRoom";

export namespace IPageIAuctionPlatformAuctionRoom {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformAuctionRoom.ISummary[];
  };
}
