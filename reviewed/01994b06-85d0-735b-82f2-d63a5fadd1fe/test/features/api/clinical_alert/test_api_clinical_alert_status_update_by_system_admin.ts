import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can update the status or detail of a clinical
 * alert.
 *
 * This test covers:
 *
 * - System admin registration and login
 * - Simulating an existing clinical alert (as creation endpoint is not present)
 * - System admin updates alert status and/or detail
 * - Verifies changes are persisted for allowed fields
 * - Checks unchanged immutable properties
 * - Ensures only admins can perform updates (negative test: attempt as
 *   not-logged-in)
 * - Handles bad alertId and finalized alerts (negative/edge tests)
 */
export async function test_api_clinical_alert_status_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. System admin registers
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. System admin logs in (to confirm authentication/session flow)
  const adminLoginInput = {
    email: adminJoinInput.email,
    provider: "local",
    provider_key: adminJoinInput.provider_key,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminLogin);

  // 3. Simulate an existing clinical alert (since no create endpoint is exposed, use typia.random)
  const alert = typia.random<IHealthcarePlatformClinicalAlert>();
  typia.assert(alert);

  // 4. System admin updates alert (status/detail)
  const updateInput = {
    status: "acknowledged",
    detail: RandomGenerator.content({ paragraphs: 1, sentenceMin: 3 }),
    acknowledged_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformClinicalAlert.IUpdate;
  const updatedAlert =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.update(
      connection,
      {
        alertId: alert.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAlert);
  TestValidator.equals(
    "updated alert id matches input",
    updatedAlert.id,
    alert.id,
  );
  TestValidator.equals(
    "updated alert status",
    updatedAlert.status,
    updateInput.status,
  );
  TestValidator.equals(
    "updated alert detail",
    updatedAlert.detail,
    updateInput.detail,
  );
  TestValidator.equals(
    "updated acknowledged_at",
    updatedAlert.acknowledged_at,
    updateInput.acknowledged_at,
  );

  // Check that immutable properties remain unchanged
  TestValidator.equals(
    "alert decision support rule unchanged",
    updatedAlert.decision_support_rule_id,
    alert.decision_support_rule_id,
  );
  TestValidator.equals(
    "alert organization id unchanged",
    updatedAlert.organization_id,
    alert.organization_id,
  );
  TestValidator.equals(
    "alert creation time unchanged",
    updatedAlert.created_at,
    alert.created_at,
  );

  // 5. Negative test: update as a non-admin (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden for unauthenticated user", async () => {
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.update(
      unauthConn,
      {
        alertId: alert.id,
        body: { status: "escalated" },
      },
    );
  });

  // 6. Negative test: bad alertId
  await TestValidator.error("bad alertId (not found)", async () => {
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.update(
      connection,
      {
        alertId: typia.random<string & tags.Format<"uuid">>(),
        body: { status: "resolved" },
      },
    );
  });

  // 7. Edge test: attempt update after finalized (resolved) status
  const resolveInput = {
    status: "resolved",
    resolved_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformClinicalAlert.IUpdate;
  const resolvedAlert =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.update(
      connection,
      {
        alertId: alert.id,
        body: resolveInput,
      },
    );
  typia.assert(resolvedAlert);
  TestValidator.equals(
    "resolved alert status updated",
    resolvedAlert.status,
    resolveInput.status,
  );

  // After finalize, should disallow further status-changing update
  await TestValidator.error(
    "cannot update finalized (resolved) alert",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.update(
        connection,
        {
          alertId: alert.id,
          body: { status: "escalated" },
        },
      );
    },
  );
}
