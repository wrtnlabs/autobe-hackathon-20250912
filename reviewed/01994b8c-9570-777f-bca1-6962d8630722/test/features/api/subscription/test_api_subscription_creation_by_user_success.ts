import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * This scenario tests the complete process of a user creating a new
 * subscription associated with a vendor.
 *
 * Business Context and Test Purpose: This test function validates that a user
 * can successfully create a subscription linked to a valid subscription vendor
 * with all required details. It ensures the unique constraints on subscription
 * entries for a user and vendor combination are respected. It also verifies
 * automatic calculation of the next renewal date based on the billing cycle and
 * start date. The test includes authentication as a user, vendor creation,
 * subscription creation, and asserts that the returned subscription data is
 * structurally and semantically correct.
 *
 * Step-by-step Process:
 *
 * 1. Authenticate a user through the /auth/user/join endpoint. This creates a new
 *    user account and obtains the authorization token.
 * 2. Create a subscription vendor using the
 *    /subscriptionRenewalGuardian/user/vendors endpoint with a randomly
 *    generated unique name.
 * 3. Create a subscription via the /subscriptionRenewalGuardian/user/subscriptions
 *    endpoint using the vendor created and user authenticated in previous
 *    steps. Provide all required subscription details (billing cycle, amount,
 *    currency, plan name, start date).
 * 4. Verify the response subscription object matches expected properties and
 *    formats, including unique identifiers and correctly calculated next
 *    renewal date.
 * 5. Confirm that the subscription's user_id matches the authenticated user's ID,
 *    and vendor_id matches the created vendor's ID.
 *
 * Validation and Assertions:
 *
 * - Use typia.assert to confirm type safety of all returned objects.
 * - Validate that subscription's user_id equals the authenticated user's ID.
 * - Validate that subscription's vendor_id equals the vendor created.
 * - Check that plan_name matches the one specified in the create request.
 * - Check billing_cycle value is one of the allowed enum values.
 * - Check status is either the default "ACTIVE" or the explicitly passed status.
 * - Check next_renewal_at is correctly calculated by adding the billing cycle
 *   intervals to started_at date until the next_renewal_at is in the future.
 * - Validate timestamps are ISO 8601 date-time format strings.
 *
 * Business Rules:
 *
 * - Subscription plans are unique per user-vendor combination.
 * - Only users can create subscriptions for themselves.
 * - Vendor names must be unique.
 *
 * Error Handling:
 *
 * - The function does not test error scenarios here but expects unique constraint
 *   enforcement and validation to happen at the API level.
 *
 * NOTE: For all date/time fields, use ISO 8601 strings. Use typia.random for
 * UUIDs and generate realistic values for other fields. Randomly select billing
 * cycle from allowed enum values.
 *
 * This is an end-to-end test ensuring full realistic user workflow for
 * subscription creation.
 */
export async function test_api_subscription_creation_by_user_success(
  connection: api.IConnection,
) {
  // Step 1: User authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(10);

  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
      },
    });
  typia.assert(user);

  // Step 2: Create a subscription vendor
  const vendorName: string = RandomGenerator.name();
  const vendor: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: {
          name: vendorName,
        },
      },
    );
  typia.assert(vendor);

  // Step 3: Create a subscription
  const billingCycleEnums = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
  const randomBillingCycle = RandomGenerator.pick(billingCycleEnums);

  const planName: string = RandomGenerator.name(3);

  const startedAt: string = new Date().toISOString();
  const amount: number = Math.round(Math.random() * 1000 * 100) / 100; // between 0 and 1000 with 2 decimals
  const currency: string = "USD";

  const subscriptionCreateBody = {
    vendor_id: vendor.id,
    plan_name: planName,
    billing_cycle: randomBillingCycle,
    amount: amount,
    currency: currency,
    started_at: startedAt,
    status: "ACTIVE",
  } satisfies ISubscriptionRenewalGuardianSubscriptions.ICreate;

  const subscription: ISubscriptionRenewalGuardianSubscriptions =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Validation
  TestValidator.equals(
    "subscription user_id equals authenticated user id",
    subscription.user_id,
    user.id,
  );
  TestValidator.equals(
    "subscription vendor_id equals created vendor id",
    subscription.vendor_id,
    vendor.id,
  );
  TestValidator.equals(
    "subscription plan_name matches",
    subscription.plan_name,
    planName,
  );
  TestValidator.predicate(
    "subscription billing_cycle inside enum",
    billingCycleEnums.includes(subscription.billing_cycle),
  );
  TestValidator.equals(
    "subscription status is ACTIVE",
    subscription.status,
    "ACTIVE",
  );

  // Validate ISO date-time format by typia.assert (guaranteed)
  typia.assert<`${string & tags.Format<"date-time">}`>(subscription.started_at);
  typia.assert<`${string & tags.Format<"date-time">}`>(
    subscription.next_renewal_at,
  );

  // Validate next_renewal_at is after started_at, and based on billing cycle
  const startedDate = new Date(subscription.started_at);
  const nextRenewalDate = new Date(subscription.next_renewal_at);
  TestValidator.predicate(
    "next_renewal_at is in the future compared to now",
    nextRenewalDate.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "next_renewal_at is after started_at",
    nextRenewalDate.getTime() > startedDate.getTime(),
  );

  // Manual check of next renewal calculation
  let validNextRenewal = false;
  const now = Date.now();
  let tentativeDate = new Date(startedDate.getTime());
  while (tentativeDate.getTime() <= now) {
    switch (subscription.billing_cycle) {
      case "DAILY":
        tentativeDate.setUTCDate(tentativeDate.getUTCDate() + 1);
        break;
      case "WEEKLY":
        tentativeDate.setUTCDate(tentativeDate.getUTCDate() + 7);
        break;
      case "MONTHLY":
        tentativeDate.setUTCMonth(tentativeDate.getUTCMonth() + 1);
        break;
      case "YEARLY":
        tentativeDate.setUTCFullYear(tentativeDate.getUTCFullYear() + 1);
        break;
    }
  }
  validNextRenewal = tentativeDate.getTime() === nextRenewalDate.getTime();

  TestValidator.predicate(
    "next_renewal_at date computed correctly",
    validNextRenewal,
  );
}
