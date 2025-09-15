import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * End-to-end test that verifies a technician can fetch their notification
 * and that proper error handling occurs for not-found cases.
 *
 * Steps:
 *
 * 1. Register a new technician and log in.
 * 2. Register a new system admin and log in.
 * 3. As system admin, deliver a notification to the technician.
 * 4. As technician, fetch the delivered notification by ID (should succeed).
 * 5. As technician, fetch a random (non-existent) notification by ID (should
 *    fail with error, no sensitive information leakage).
 *
 * Validation:
 *
 * - Confirm notification content matches expectations (recipient, fields).
 * - Confirm delivery is limited to correct recipient.
 * - Confirm 404 error (or proper error) on unknown notificationID.
 */
export async function test_api_technician_notification_fetch_and_not_found_case(
  connection: api.IConnection,
) {
  // 1. Register technician (with password) and login
  const technicianEmail = typia.random<string & tags.Format<"email">>();
  const technicianPassword = RandomGenerator.alphaNumeric(12);
  const technicianLicense = RandomGenerator.alphaNumeric(10);
  const technicianName = RandomGenerator.name();
  await api.functional.auth.technician.join(connection, {
    body: {
      email: technicianEmail,
      full_name: technicianName,
      license_number: technicianLicense,
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  const technicianLogin = await api.functional.auth.technician.login(
    connection,
    {
      body: {
        email: technicianEmail,
        password: technicianPassword,
      } satisfies IHealthcarePlatformTechnician.ILogin,
    },
  );
  typia.assert(technicianLogin);

  // 2. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminName = RandomGenerator.name();
  const adminProvider = "local";
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminName,
      provider: adminProvider,
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  const systemAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: adminProvider,
        provider_key: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(systemAdminLogin);

  // 3. As system admin, create notification to the registered technician
  const notificationCreate =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      {
        body: {
          recipientUserId: technicianLogin.id,
          notificationType: "test_direct_message",
          notificationChannel: "in_app",
          subject: "Direct Technician Test",
          body: "Test system notification content.",
          critical: true,
        } satisfies IHealthcarePlatformNotification.ICreate,
      },
    );
  typia.assert(notificationCreate);

  // 4. Switch to technician and fetch notification by ID (should succeed)
  await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianEmail,
      password: technicianPassword,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  const output =
    await api.functional.healthcarePlatform.technician.notifications.at(
      connection,
      {
        notificationId: notificationCreate.id,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "notification recipient matches technician",
    output.recipientUserId,
    technicianLogin.id,
  );
  TestValidator.equals(
    "notification subject matches",
    output.subject,
    "Direct Technician Test",
  );
  TestValidator.equals("notification critical true", output.critical, true);

  // 5. Attempt to fetch a notification with a random UUID (should error)
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching nonexistent notification should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.notifications.at(
        connection,
        {
          notificationId: nonExistentNotificationId,
        },
      );
    },
  );
}
