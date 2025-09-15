import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates service alert creation, uniqueness constraint enforcement, and
 * business logic error handling for the system administrator role.
 *
 * Test Flow:
 *
 * 1. Registers a new system administrator with a unique external_admin_id and
 *    email, ensuring valid onboarding.
 * 2. Logs in using those credentials for privileged operations.
 * 3. Creates a valid service alert with all mandatory fields, then verifies that
 *    the returned data matches the schema and business content expectations.
 * 4. Attempts to create another alert with the same alert_code and environment,
 *    and verifies that a conflict error is produced (if uniqueness constraint
 *    is enforced by business logic).
 *
 * Explicitly omits any type error or missing-fields validation (which are
 * forbidden in E2E tests and must never be written or tested). All tests focus
 * strictly on valid runtime business logic flows and business/runtime errors
 * such as uniqueness violations.
 */
export async function test_api_service_alert_creation_success_and_conflict(
  connection: api.IConnection,
) {
  // Step 1: Register a new systemAdmin
  const external_admin_id = RandomGenerator.alphaNumeric(12);
  const admin_email = `${RandomGenerator.name(1).replace(/\s+/g, "")}${typia.random<number & tags.Type<"uint32">>().toString()}@autobe-admin.com`;
  const joinPayload = {
    external_admin_id,
    email: admin_email,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: joinPayload,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "systemAdmin join - email matches",
    joinResult.email,
    admin_email,
  );
  TestValidator.equals(
    "systemAdmin join - external_admin_id matches",
    joinResult.external_admin_id,
    external_admin_id,
  );

  // Step 2: Login as systemAdmin
  const loginPayload = {
    external_admin_id,
    email: admin_email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginPayload,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "systemAdmin login - id matches join",
    loginResult.id,
    joinResult.id,
  );

  // Step 3: Create a valid service alert
  const alertType = RandomGenerator.pick([
    "incident",
    "error",
    "warning",
    "quota",
    "info",
    "recovery",
  ] as const);
  const env = RandomGenerator.pick([
    "production",
    "staging",
    "development",
    "local",
  ] as const);
  const alertCode = `AI_ALERT_${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const content = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 16,
  });
  const serviceAlertPayload = {
    alert_type: alertType,
    alert_code: alertCode,
    content,
    environment: env,
    resolved: false,
    resolution_note: null,
  } satisfies IStoryfieldAiServiceAlert.ICreate;
  const alert =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
      connection,
      { body: serviceAlertPayload },
    );
  typia.assert(alert);
  TestValidator.equals(
    "serviceAlert - alert_type matches",
    alert.alert_type,
    alertType,
  );
  TestValidator.equals(
    "serviceAlert - alert_code matches",
    alert.alert_code,
    alertCode,
  );
  TestValidator.equals(
    "serviceAlert - content matches",
    alert.content,
    content,
  );
  TestValidator.equals(
    "serviceAlert - environment matches",
    alert.environment,
    env,
  );
  TestValidator.equals(
    "serviceAlert - resolved should be false on creation",
    alert.resolved,
    false,
  );
  TestValidator.equals(
    "serviceAlert - deleted_at should be null",
    alert.deleted_at,
    null,
  );

  // Step 4: Attempt to create duplicate alert (same alertCode/environment, expect error if unique)
  await TestValidator.error(
    "conflict on duplicate alert_code/environment should error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
        connection,
        {
          body: {
            alert_type: alertType,
            alert_code: alertCode,
            content: RandomGenerator.content({ paragraphs: 1 }),
            environment: env,
            resolved: false,
            resolution_note: null,
          } satisfies IStoryfieldAiServiceAlert.ICreate,
        },
      );
    },
  );
}
