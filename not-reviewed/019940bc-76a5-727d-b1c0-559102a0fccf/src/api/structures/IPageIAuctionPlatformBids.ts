import { IPage } from "./IPage";
import { IAuctionPlatformBids } from "./IAuctionPlatformBids";

export namespace IPageIAuctionPlatformBids {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformBids.ISummary[];
  };
}
