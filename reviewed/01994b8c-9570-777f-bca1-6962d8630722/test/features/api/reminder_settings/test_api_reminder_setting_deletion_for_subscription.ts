import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianReminderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianReminderSettings";
import type { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * Validate the deletion process of a reminder setting for a user's
 * subscription.
 *
 * This test covers an entire user workflow including:
 *
 * 1. User registration and authentication
 * 2. Vendor creation
 * 3. Subscription creation linked to the user and vendor
 * 4. Reminder setting creation for the subscription
 * 5. Deletion of the reminder setting by the subscription owner
 * 6. Validation that deleting a non-existent reminder setting fails
 * 7. Unauthorized user attempting deletion and receiving an error
 *
 * The test ensures authorization boundaries, data consistency, and proper
 * error handling within these operations.
 *
 * Each operation utilizes the exact DTO types from the API and asserts
 * responses correctly using typia. The workflow validates the full cycle of
 * reminder setting lifecycle and relevant security policies.
 *
 * @param connection API connection context
 */
export async function test_api_reminder_setting_deletion_for_subscription(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPasswordHash = RandomGenerator.alphaNumeric(16);
  const userA: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password_hash: userAPasswordHash,
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  typia.assert(userA);

  // 2. Create a vendor
  const vendorName = RandomGenerator.name(2);
  const vendor: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: {
          name: vendorName,
        } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
      },
    );
  typia.assert(vendor);

  // 3. Create a subscription for User A
  const subscriptionPlanName = RandomGenerator.paragraph({
    sentences: 2,
  }).slice(0, 30);
  const billingCycle: ISubscriptionRenewalGuardianSubscriptions.ICreate["billing_cycle"] =
    typia.random<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">();
  const subscriptionAmount = Math.floor(Math.random() * 1000) + 10; // realistic amount between 10~1009
  const currency = "USD";
  const startedAt = new Date().toISOString();
  const subscriptionCreateBody = {
    vendor_id: vendor.id,
    plan_name: subscriptionPlanName,
    billing_cycle: billingCycle,
    amount: subscriptionAmount,
    currency: currency,
    started_at: startedAt,
    status: "ACTIVE",
    notes: null,
  } satisfies ISubscriptionRenewalGuardianSubscriptions.ICreate;

  const subscription: ISubscriptionRenewalGuardianSubscriptions =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription user_id matches user",
    subscription.user_id,
    userA.id,
  );
  TestValidator.equals(
    "subscription vendor_id matches vendor",
    subscription.vendor_id,
    vendor.id,
  );

  // 4. Create a reminder setting for the subscription
  const daysBeforeOptions = [7, 3, 1] as const;
  const reminderDaysBefore = RandomGenerator.pick(daysBeforeOptions);
  const channelOptions = ["EMAIL", "NONE"] as const;
  const reminderChannel = RandomGenerator.pick(channelOptions);
  const reminderSettingCreateBody = {
    subscription_id: subscription.id,
    days_before: reminderDaysBefore,
    channel: reminderChannel,
  } satisfies ISubscriptionRenewalGuardianReminderSettings.ICreate;

  const reminderSetting: ISubscriptionRenewalGuardianReminderSettings =
    await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.create(
      connection,
      {
        subscriptionId: subscription.id,
        body: reminderSettingCreateBody,
      },
    );
  typia.assert(reminderSetting);
  TestValidator.equals(
    "reminder setting subscription_id matches subscription",
    reminderSetting.subscription_id,
    subscription.id,
  );
  TestValidator.equals(
    "reminder setting days_before matches request",
    reminderSetting.days_before,
    reminderDaysBefore,
  );
  TestValidator.equals(
    "reminder setting channel matches request",
    reminderSetting.channel,
    reminderChannel,
  );

  // 5. Delete the reminder setting by subscription owner (User A)
  await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.erase(
    connection,
    {
      subscriptionId: subscription.id,
      reminderSettingId: reminderSetting.id,
    },
  );

  // 6. Attempt to delete the same reminder setting again: should error (404)
  await TestValidator.error(
    "deleting a non-existent reminder setting throws",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.erase(
        connection,
        {
          subscriptionId: subscription.id,
          reminderSettingId: reminderSetting.id,
        },
      );
    },
  );

  // 7. Register and authenticate second user (User B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPasswordHash = RandomGenerator.alphaNumeric(16);
  const userB: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userBEmail,
        password_hash: userBPasswordHash,
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  typia.assert(userB);

  // 8. Attempt to delete reminder setting with unauthorized user B: should error as reminderSetting is deleted
  await TestValidator.error(
    "unauthorized user cannot delete reminder setting",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.reminderSettings.erase(
        connection,
        {
          subscriptionId: subscription.id,
          reminderSettingId: reminderSetting.id,
        },
      );
    },
  );
}
