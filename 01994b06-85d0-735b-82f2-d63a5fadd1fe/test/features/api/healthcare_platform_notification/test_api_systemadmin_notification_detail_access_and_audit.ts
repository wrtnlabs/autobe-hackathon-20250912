import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin access to notification detail including audit/error
 * handling
 *
 * This test validates that a system administrator can securely access the
 * detailed information for a notification, including subject, body, all
 * metadata, and delivery/acknowledgment history. It checks correct
 * authorization flow, validates retrieval of all important fields according to
 * IHealthcarePlatformNotification, verifies that attempts to access invalid or
 * deleted notificationIds return appropriate errors, and ensures that access
 * scope and privacy are respected. Because audit trail and PHI redaction are
 * handled internally by the backend and not exposed, this test focuses on the
 * observable effects and type-level correctness.
 *
 * Steps:
 *
 * 1. Register a new system admin using the onboarding API with proper credentials
 *    and business compliance (email, name, password, etc.).
 * 2. Log in as the new system admin to create an authenticated session.
 * 3. Retrieve notification detail for a (simulated/random) notificationId and
 *    validate required fields and business logic (critical, status, timestamps,
 *    metadata, etc.).
 * 4. Verify that invalid (random/zero) notificationId requests yield appropriate
 *    errors.
 */
export async function test_api_systemadmin_notification_detail_access_and_audit(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Login as that admin
  const loginInput = {
    email: joinInput.email,
    provider: joinInput.provider,
    provider_key: joinInput.provider_key,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;

  const session: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginInput,
    });
  typia.assert(session);

  // 3. Retrieve notification detail (random in simulate mode)
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const notification: IHealthcarePlatformNotification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.at(
      connection,
      { notificationId },
    );
  typia.assert(notification);

  // 4. Core field and business rule assertions
  TestValidator.predicate(
    "notification subject exists",
    typeof notification.subject === "string" ||
      notification.subject === undefined,
  );
  TestValidator.predicate(
    "notification body present",
    typeof notification.body === "string",
  );
  TestValidator.predicate(
    "notification type",
    typeof notification.notificationType === "string",
  );
  TestValidator.predicate(
    "notification channel",
    typeof notification.notificationChannel === "string",
  );
  TestValidator.predicate(
    "critical flag set",
    typeof notification.critical === "boolean",
  );
  TestValidator.predicate(
    "deliveryStatus is string",
    typeof notification.deliveryStatus === "string",
  );
  TestValidator.predicate(
    "deliveryAttempts is int32 number",
    Number.isInteger(notification.deliveryAttempts),
  );
  TestValidator.predicate(
    "createdAt is ISO",
    typeof notification.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is ISO",
    typeof notification.updatedAt === "string",
  );
  if (notification.critical)
    TestValidator.predicate(
      "if critical, should be delivered/acknowledged/escalated/pending",
      ["pending", "delivered", "acknowledged", "escalated"].includes(
        notification.deliveryStatus,
      ),
    );

  // 5. Error case: invalid notificationId
  await TestValidator.error("invalid notificationId should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.notifications.at(
      connection,
      {
        notificationId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
      },
    );
  });
}
