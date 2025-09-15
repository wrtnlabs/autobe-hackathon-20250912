import { IPage } from "./IPage";
import { IAuctionPlatformAdmin } from "./IAuctionPlatformAdmin";

export namespace IPageIAuctionPlatformAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformAdmin.ISummary[];
  };
}
