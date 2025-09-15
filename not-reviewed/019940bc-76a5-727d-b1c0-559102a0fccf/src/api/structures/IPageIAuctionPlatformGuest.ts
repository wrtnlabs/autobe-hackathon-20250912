import { IPage } from "./IPage";
import { IAuctionPlatformGuest } from "./IAuctionPlatformGuest";

export namespace IPageIAuctionPlatformGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformGuest.ISummary[];
  };
}
