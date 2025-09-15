import { tags } from "typia";

export namespace ISubscriptionRenewalGuardianSubscriptions {
  /** Request schema for filtering subscription list with pagination. */
  export type IRequest = {
    /** Filter by status values. */
    status?: "ACTIVE" | "PAUSED" | "CANCELED" | undefined;

    /** Filter by vendor ID. */
    vendor_id?: (string & tags.Format<"uuid">) | undefined;

    /** Filter by plan name. */
    plan_name?: string | undefined;

    /** Filter by minimum next renewal date. */
    next_renewal_from?: (string & tags.Format<"date-time">) | undefined;

    /** Filter by maximum next renewal date. */
    next_renewal_to?: (string & tags.Format<"date-time">) | undefined;

    /** Pagination parameter: page number. */
    page?: (number & tags.Type<"int32">) | undefined;

    /** Pagination parameter: limit of records per page. */
    limit?: (number & tags.Type<"int32">) | undefined;
  };

  /** Summary view of subscription for listing and brief info. */
  export type ISummary = {
    /** Unique identifier of the subscription. */
    id: string & tags.Format<"uuid">;

    /** Name of the subscription plan. */
    plan_name: string;

    /**
     * Billing cycle of the subscription. One of DAILY, WEEKLY, MONTHLY, or
     * YEARLY.
     */
    billing_cycle: string;

    /** Next scheduled renewal date in UTC ISO 8601 format. */
    next_renewal_at: string & tags.Format<"date-time">;

    /** Subscription status. */
    status: "ACTIVE" | "PAUSED" | "CANCELED";

    /** Subscription amount, non-negative. */
    amount: number;

    /** Currency code compliant with ISO 4217. */
    currency: string;
  };
}
