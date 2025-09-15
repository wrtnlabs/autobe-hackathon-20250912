import { IPage } from "./IPage";
import { IAuctionPlatformPointBalances } from "./IAuctionPlatformPointBalances";

export namespace IPageIAuctionPlatformPointBalances {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformPointBalances.ISummary[];
  };
}
