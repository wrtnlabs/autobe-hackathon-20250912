import { IPage } from "./IPage";
import { IAuctionPlatformMember } from "./IAuctionPlatformMember";

export namespace IPageIAuctionPlatformMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformMember.ISummary[];
  };
}
