import { IPage } from "./IPage";
import { IAuctionPlatformSponsorshipEvent } from "./IAuctionPlatformSponsorshipEvent";

export namespace IPageIAuctionPlatformSponsorshipEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformSponsorshipEvent.ISummary[];
  };
}
