import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";

/**
 * This test validates the update operation on an existing FlexOffice system
 * alert by an authenticated admin user.
 *
 * It covers:
 *
 * 1. Admin account creation (join) with email and password.
 * 2. Admin authentication (login) acquiring authorization tokens.
 * 3. System alert creation with initial random alert data.
 * 4. Updating the system alert with new severity, message, resolution state, and
 *    resolved timestamp.
 * 5. Verification that the updated alert returned reflects all changes accurately.
 *
 * The test ensures the entire update process works end-to-end with proper
 * authorization, valid inputs, and accurate output validation using typia
 * assertions and business logic validators.
 */
export async function test_api_system_alert_update_with_valid_input(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const joined: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(joined);

  // 2. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const logged: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(logged);

  // 3. Create new alert
  const alertCreateBody = typia.random<IFlexOfficeSystemAlerts.ICreate>();
  const createdAlert: IFlexOfficeSystemAlerts =
    await api.functional.flexOffice.admin.systemAlerts.create(connection, {
      body: alertCreateBody,
    });
  typia.assert(createdAlert);

  // 4. Update the alert
  const updatedBody = {
    severity: "warning",
    message: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 8,
      wordMax: 12,
    }),
    is_resolved: true,
    resolved_at: new Date().toISOString(),
  } satisfies IFlexOfficeSystemAlerts.IUpdate;

  const updatedAlert: IFlexOfficeSystemAlerts =
    await api.functional.flexOffice.admin.systemAlerts.update(connection, {
      id: createdAlert.id,
      body: updatedBody,
    });
  typia.assert(updatedAlert);

  // Validate that updated alert matches update input values
  TestValidator.equals(
    "severity updated",
    updatedAlert.severity,
    updatedBody.severity,
  );
  TestValidator.equals(
    "message updated",
    updatedAlert.message,
    updatedBody.message,
  );
  TestValidator.equals(
    "is_resolved updated",
    updatedAlert.is_resolved,
    updatedBody.is_resolved,
  );
  TestValidator.equals(
    "resolved_at updated",
    updatedAlert.resolved_at,
    updatedBody.resolved_at,
  );
}
