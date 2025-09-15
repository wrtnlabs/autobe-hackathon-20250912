import { tags } from "typia";

export namespace IAuctionPlatformPageIAuctionPlatformIconPurchase {
  /**
   * Summary view for auction platform icon purchase records. Contains
   * essential identifier and icon code.
   */
  export type ISummary = {
    /**
     * Primary Key.
     *
     * Identifier of the icon purchase summary record.
     */
    id: string & tags.Format<"uuid">;

    /** Icon code representing the purchased icon. */
    icon_code: string;
  };
}
