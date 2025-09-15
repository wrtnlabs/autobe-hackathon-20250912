import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import type { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

export async function test_api_reminder_setting_creation_for_subscription(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;
  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // Step 2: Create a vendor
  const vendorCreateBody = {
    name: RandomGenerator.name(2),
  } satisfies ISubscriptionRenewalGuardianVendor.ICreate;
  const vendor: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      { body: vendorCreateBody },
    );
  typia.assert(vendor);

  // Step 3: Create a subscription under the authenticated user linked to the vendor
  const startedAt = new Date().toISOString();
  const subscriptionCreateBody = {
    vendor_id: vendor.id,
    plan_name: RandomGenerator.name(2),
    billing_cycle: "MONTHLY",
    amount: 1999,
    currency: "USD",
    started_at: startedAt,
    status: "ACTIVE",
  } satisfies ISubscriptionRenewalGuardianSubscriptions.ICreate;
  const subscription: ISubscriptionRenewalGuardianSubscriptions =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // Step 4: Create valid reminder settings days_before in [7, 3, 1] with channel EMAIL or NONE
  const validDaysBeforeValues: Array<7 | 3 | 1> = [7, 3, 1];
  for (const daysBefore of validDaysBeforeValues) {
    const reminderCreateBody = {
      subscription_id: subscription.id,
      days_before: daysBefore,
      channel: daysBefore === 3 ? "NONE" : "EMAIL",
    } satisfies ISubscriptionRenewalGuardianReminderSettings.ICreate;
    const reminder: ISubscriptionRenewalGuardianReminderSettings =
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.create(
        connection,
        {
          subscriptionId: subscription.id,
          body: reminderCreateBody,
        },
      );
    typia.assert(reminder);
    TestValidator.equals(
      `reminder days_before should be ${daysBefore}`,
      reminder.days_before,
      daysBefore,
    );
    TestValidator.predicate(
      `reminder channel is EMAIL or NONE`,
      reminder.channel === "EMAIL" || reminder.channel === "NONE",
    );
  }

  // Step 5: Test unauthorized access - create reminder with unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const unauthorizedReminderBody = {
    subscription_id: subscription.id,
    days_before: 7,
    channel: "EMAIL",
  } satisfies ISubscriptionRenewalGuardianReminderSettings.ICreate;
  await TestValidator.error(
    "creating reminder without auth should fail",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.create(
        unauthConnection,
        {
          subscriptionId: subscription.id,
          body: unauthorizedReminderBody,
        },
      );
    },
  );

  // Step 6: Test conflict error by creating duplicate reminder setting with days_before = 7 again
  const duplicateReminderBody = {
    subscription_id: subscription.id,
    days_before: 7,
    channel: "EMAIL",
  } satisfies ISubscriptionRenewalGuardianReminderSettings.ICreate;
  await TestValidator.error(
    "creating duplicate reminder days_before should fail",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.create(
        connection,
        {
          subscriptionId: subscription.id,
          body: duplicateReminderBody,
        },
      );
    },
  );
}
