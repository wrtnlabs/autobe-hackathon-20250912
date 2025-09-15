import { IPage } from "./IPage";
import { IAuctionPlatformAuctionCandidates } from "./IAuctionPlatformAuctionCandidates";

export namespace IPageIAuctionPlatformAuctionCandidates {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformAuctionCandidates.ISummary[];
  };
}
