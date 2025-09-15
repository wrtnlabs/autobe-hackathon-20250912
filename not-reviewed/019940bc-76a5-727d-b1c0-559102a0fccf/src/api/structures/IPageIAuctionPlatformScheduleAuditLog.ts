import { IPage } from "./IPage";
import { IAuctionPlatformScheduleAuditLog } from "./IAuctionPlatformScheduleAuditLog";

export namespace IPageIAuctionPlatformScheduleAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAuctionPlatformScheduleAuditLog.ISummary[];
  };
}
