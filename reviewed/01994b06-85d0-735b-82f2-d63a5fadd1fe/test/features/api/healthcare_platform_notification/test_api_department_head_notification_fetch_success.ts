import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate fetching a notification as department head (positive flow, proper
 * permissions).
 *
 * Scenario:
 *
 * 1. Register department head and log in to get authentication and user id.
 * 2. Register system admin and log in.
 * 3. System admin creates a notification with recipientUserId = department head's
 *    id.
 * 4. Switch to department head user (login), using their credentials.
 * 5. Fetch the notification with
 *    /healthcarePlatform/departmentHead/notifications/{notificationId}.
 * 6. Assert correct content, recipient id, channel, status, delivery metadata
 *    present.
 * 7. Assert business logic: Department head is indeed the intended recipient and
 *    content matches what was created.
 */
export async function test_api_department_head_notification_fetch_success(
  connection: api.IConnection,
) {
  // 1. Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadFullName = RandomGenerator.name();
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: deptHeadFullName,
        password: deptHeadPassword,
        phone: RandomGenerator.mobile(),
        sso_provider: undefined,
        sso_provider_key: undefined,
      },
    },
  );
  typia.assert(deptHeadJoin);
  const deptHeadId = deptHeadJoin.id;

  // 2. Log in as department head to establish session (token updated by SDK)
  const deptHeadLogin = await api.functional.auth.departmentHead.login(
    connection,
    {
      body: {
        email: deptHeadEmail,
        password: deptHeadPassword,
        sso_provider: undefined,
        sso_provider_key: undefined,
      },
    },
  );
  typia.assert(deptHeadLogin);

  // 3. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(15);
  const adminFullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoin);

  // 4. Log in as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);

  // 5. System admin creates notification assigned to department head (required fields)
  const notificationCreate =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: {
          recipientUserId: deptHeadId,
          notificationType: "general_alert",
          notificationChannel: RandomGenerator.pick([
            "in_app",
            "email",
            "sms",
            "push",
            "phone_call",
          ] as const),
          subject: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          payloadLink: undefined,
          critical: true,
          organizationId: undefined,
          senderUserId: adminJoin.id,
        },
      },
    );
  typia.assert(notificationCreate);

  // 6. Switch to department head account (log in again)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
      sso_provider: undefined,
      sso_provider_key: undefined,
    },
  });

  // 7. Department head fetches notification
  const notificationFetched =
    await api.functional.healthcarePlatform.departmentHead.notifications.at(
      connection,
      {
        notificationId: notificationCreate.id,
      },
    );
  typia.assert(notificationFetched);

  // 8. Assertions of critical notification properties and identity
  TestValidator.equals(
    "recipientUserId should match department head",
    notificationFetched.recipientUserId,
    deptHeadId,
  );
  TestValidator.equals(
    "id matches created notification",
    notificationFetched.id,
    notificationCreate.id,
  );
  TestValidator.equals(
    "subject matches created notification",
    notificationFetched.subject,
    notificationCreate.subject,
  );
  TestValidator.equals(
    "body matches",
    notificationFetched.body,
    notificationCreate.body,
  );
  TestValidator.equals(
    "senderUserId matches admin",
    notificationFetched.senderUserId,
    adminJoin.id,
  );
  TestValidator.predicate(
    "critical flag should be true",
    notificationFetched.critical === true,
  );
  TestValidator.predicate(
    "status should be present",
    typeof notificationFetched.deliveryStatus === "string" &&
      notificationFetched.deliveryStatus.length > 0,
  );
  TestValidator.predicate(
    "deliveryAttempts should be a non-negative integer",
    typeof notificationFetched.deliveryAttempts === "number" &&
      notificationFetched.deliveryAttempts >= 0,
  );
  TestValidator.predicate(
    "createdAt/updatedAt are present",
    typeof notificationFetched.createdAt === "string" &&
      typeof notificationFetched.updatedAt === "string",
  );
  TestValidator.equals(
    "notificationChannel matches",
    notificationFetched.notificationChannel,
    notificationCreate.notificationChannel,
  );
}
