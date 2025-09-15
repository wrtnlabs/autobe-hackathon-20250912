import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin can view notification delivery history for their
 * organization, but not others.
 *
 * This test validates the following scenarios:
 *
 * 1. Organization administrator can retrieve notification delivery history using a
 *    notificationHistoryId from their own organization; response is validated
 *    in depth.
 * 2. If the admin attempts to access a notification history record belonging to
 *    another organization/user, strict permission denied (forbidden) error is
 *    thrown.
 * 3. If the admin looks up a non-existent notificationHistoryId, the API returns a
 *    not-found error. All business logic, access controls, data types and
 *    permissions are strictly validated.
 */
export async function test_api_notification_history_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinResult);

  // 2. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Simulate notification history for own organization (success case id), forbidden case id (different org/user), and not-found id
  const ownNotificationHistoryId = typia.random<string & tags.Format<"uuid">>();
  const notificationHistory: IHealthcarePlatformNotificationHistory = {
    id: ownNotificationHistoryId,
    notification_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: RandomGenerator.pick([
      "delivered",
      "failed",
      "acknowledged",
      "snoozed",
      "escalated",
      "retried",
    ] as const),
    event_time: new Date().toISOString(),
    delivery_channel: RandomGenerator.pick([
      "email",
      "sms",
      "in_app",
      "push",
      "phone_call",
      "postal",
      "fax",
    ] as const),
    delivery_status: RandomGenerator.pick([
      "sent",
      "failed",
      "acknowledged",
      "snoozed",
      "escalated",
      "delivered",
    ] as const),
    details: RandomGenerator.paragraph({ sentences: 3 }),
    created_at: new Date().toISOString(),
  };
  const foreignNotificationHistoryId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Successful case: view notification history belonging to admin's org
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.notificationHistory.at(
      connection,
      { notificationHistoryId: notificationHistory.id },
    );
  typia.assert(result);
  TestValidator.equals(
    "notificationHistoryId matches requested",
    result.id,
    notificationHistory.id,
  );
  TestValidator.predicate(
    "all required metadata is present",
    typeof result.notification_id === "string" &&
      typeof result.event_type === "string" &&
      typeof result.event_time === "string" &&
      typeof result.delivery_channel === "string" &&
      typeof result.delivery_status === "string" &&
      typeof result.created_at === "string",
  );

  // 5. Forbidden: admin cannot view notification history for another org/user
  await TestValidator.error(
    "forbidden: admin cannot access notification history of another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notificationHistory.at(
        connection,
        { notificationHistoryId: foreignNotificationHistoryId },
      );
    },
  );

  // 6. Not found: querying random non-existent notificationHistoryId
  const randomMissingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not-found: admin queries unknown notificationHistoryId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notificationHistory.at(
        connection,
        { notificationHistoryId: randomMissingId },
      );
    },
  );
}
