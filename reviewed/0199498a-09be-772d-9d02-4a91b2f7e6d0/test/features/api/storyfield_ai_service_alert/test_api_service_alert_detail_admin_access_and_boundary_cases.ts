import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate that a system administrator can retrieve service alert details and
 * that access is appropriately restricted.
 *
 * 1. Register an admin account (unique external_admin_id, business email, role).
 * 2. Log in as that admin (establish token/context).
 * 3. Create service alert (provide all required and optional fields in ICreate).
 * 4. Retrieve the alert with GET using the id, and validate all major fields.
 * 5. GET a non-existent UUID (random valid UUID), and confirm error is raised.
 * 6. Try GET with unauthenticated session (no admin auth), confirm error.
 */
export async function test_api_service_alert_detail_admin_access_and_boundary_cases(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminJoin = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Log in as system admin
  const login = {
    external_admin_id: adminJoin.external_admin_id,
    email: adminJoin.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const authed: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, { body: login });
  typia.assert(authed);

  // 3. Create service alert
  const alertCreate = {
    alert_type: RandomGenerator.pick([
      "error",
      "warning",
      "info",
      "incident",
      "quota",
    ] as const),
    alert_code: RandomGenerator.alphaNumeric(10),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    environment: RandomGenerator.pick([
      "production",
      "staging",
      "development",
      "local",
    ] as const),
    resolved: false,
    resolution_note: null,
  } satisfies IStoryfieldAiServiceAlert.ICreate;
  const alert: IStoryfieldAiServiceAlert =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
      connection,
      { body: alertCreate },
    );
  typia.assert(alert);

  // 4. Retrieve the alert by ID and validate major fields
  const alertRead: IStoryfieldAiServiceAlert =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.at(connection, {
      serviceAlertId: alert.id,
    });
  typia.assert(alertRead);
  TestValidator.equals(
    "alert id after retrieval matches",
    alertRead.id,
    alert.id,
  );
  TestValidator.equals(
    "alert payload matches (fields except generated/time)",
    alertRead.alert_type,
    alertCreate.alert_type,
  );
  TestValidator.equals(
    "alert code matches",
    alertRead.alert_code,
    alertCreate.alert_code,
  );
  TestValidator.equals(
    "alert content matches",
    alertRead.content,
    alertCreate.content,
  );
  TestValidator.equals(
    "environment matches",
    alertRead.environment,
    alertCreate.environment,
  );
  TestValidator.equals(
    "resolved is false initially",
    alertRead.resolved,
    false,
  );
  TestValidator.equals("resolution_note null", alertRead.resolution_note, null);

  // 5. GET with a random UUID (non-existent alert) -> expect error
  await TestValidator.error(
    "GET with non-existent serviceAlertId returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.at(
        connection,
        {
          serviceAlertId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Try GET as unauthenticated (no admin token)
  // Emulate unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request denied for GET /serviceAlerts/:id",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.at(
        unauthConn,
        { serviceAlertId: alert.id },
      );
    },
  );
}
