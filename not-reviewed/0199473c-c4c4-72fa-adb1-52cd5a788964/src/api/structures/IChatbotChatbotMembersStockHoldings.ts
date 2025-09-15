import { tags } from "typia";

export namespace IChatbotChatbotMembersStockHoldings {
  /**
   * Request parameters for listing stock holdings of a chatbot member with
   * filtering and pagination.
   */
  export type IRequest = {
    /**
     * Page number.
     *
     * Optional.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Limit records per page.
     *
     * Optional.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /** Optional filter to stock_item_id. */
    stock_item_id?: (string & tags.Format<"uuid">) | null | undefined;

    /** Optional filter to minimum quantity held. */
    min_quantity?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined;

    /** Optional filter to maximum quantity held. */
    max_quantity?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined;
  };
}
