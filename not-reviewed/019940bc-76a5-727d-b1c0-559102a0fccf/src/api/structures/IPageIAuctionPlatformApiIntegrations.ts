import { IPage } from "./IPage";
import { IAuctionPlatformApiIntegrations } from "./IAuctionPlatformApiIntegrations";

export namespace IPageIAuctionPlatformApiIntegrations {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformApiIntegrations.ISummary[];
  };
}
