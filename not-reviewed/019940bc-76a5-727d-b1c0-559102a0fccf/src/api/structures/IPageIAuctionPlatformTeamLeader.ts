import { IPage } from "./IPage";
import { IAuctionPlatformTeamLeader } from "./IAuctionPlatformTeamLeader";

export namespace IPageIAuctionPlatformTeamLeader {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformTeamLeader.ISummary[];
  };
}
