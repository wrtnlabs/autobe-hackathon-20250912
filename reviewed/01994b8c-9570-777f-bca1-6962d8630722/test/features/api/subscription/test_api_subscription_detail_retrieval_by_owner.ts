import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

export async function test_api_subscription_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. User registration (join) to authenticate and obtain token
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;
  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBody,
    });
  typia.assert(user);

  // 2. Create a vendor record
  const vendorBody = {
    name: `Vendor-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ISubscriptionRenewalGuardianVendor.ICreate;

  const vendor: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: vendorBody,
      },
    );
  typia.assert(vendor);

  // 3. Create a subscription tied to user and vendor
  const billingCycles = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
  const planName = `Plan-${RandomGenerator.alphaNumeric(5)}`;
  const startedAt = new Date().toISOString();

  const subscriptionBody = {
    vendor_id: vendor.id,
    plan_name: planName,
    billing_cycle: RandomGenerator.pick(billingCycles),
    amount: Number((Math.random() * 100000).toFixed(2)),
    currency: "USD",
    started_at: startedAt,
    status: "ACTIVE",
    notes: null,
  } satisfies ISubscriptionRenewalGuardianSubscriptions.ICreate;

  const subscription: ISubscriptionRenewalGuardianSubscriptions =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);

  // 4. Retrieve subscription detail by subscriptionId
  const subscriptionDetail: ISubscriptionRenewalGuardianSubscriptions =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.at(
      connection,
      { subscriptionId: subscription.id },
    );
  typia.assert(subscriptionDetail);

  // Validations:
  TestValidator.equals(
    "subscription user id matches authorized user",
    subscriptionDetail.user_id,
    user.id,
  );
  TestValidator.equals(
    "subscription id consistency",
    subscriptionDetail.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription vendor id consistency",
    subscriptionDetail.vendor_id,
    vendor.id,
  );
  TestValidator.equals(
    "subscription plan_name consistency",
    subscriptionDetail.plan_name,
    planName,
  );
  TestValidator.predicate(
    "subscription amount is non-negative",
    subscriptionDetail.amount >= 0,
  );
  TestValidator.equals(
    "subscription currency is USD",
    subscriptionDetail.currency,
    "USD",
  );
  TestValidator.equals(
    "subscription status is ACTIVE",
    subscriptionDetail.status,
    "ACTIVE",
  );
  TestValidator.predicate(
    "subscription started_at matches",
    subscriptionDetail.started_at === startedAt,
  );
  TestValidator.predicate(
    "subscription next_renewal_at is ISO8601 string",
    typeof subscriptionDetail.next_renewal_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        subscriptionDetail.next_renewal_at,
      ),
  );
  // notes can be null
  TestValidator.equals(
    "subscription notes is null",
    subscriptionDetail.notes,
    null,
  );
}
