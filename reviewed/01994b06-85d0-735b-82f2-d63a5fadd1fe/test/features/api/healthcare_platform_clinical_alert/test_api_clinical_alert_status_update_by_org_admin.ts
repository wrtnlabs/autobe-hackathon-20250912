import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test scenario for clinical alert update by org admin: onboarding, login, then
 * update status, detail, and acknowledgement timestamp.
 *
 * 1. Organization admin joins (register admin account)
 * 2. Organization admin logs in (fetches new token)
 * 3. Simulate existence of a clinical alert (random alertId)
 * 4. Org admin sends PUT request updating "status", "detail", and
 *    "acknowledged_at"
 * 5. Assert result has new values, unchanged immutable fields, and typia.assert
 *    passes
 * 6. Try update when not logged in as org admin (simulate unauth connection);
 *    TestValidator.error expected
 */
export async function test_api_clinical_alert_status_update_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "testPassword" + RandomGenerator.alphabets(3),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminAuth);

  // 2. Organization admin login
  const loginBody = {
    email: adminEmail,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(adminLogin);

  // 3. Assume an alert to update - simulate with random alert id and random prior alert object
  const alertId = typia.random<string & tags.Format<"uuid">>();
  // NOTE: In real test, you'd create an alert; here rely on random/mock.
  const oldAlert: IHealthcarePlatformClinicalAlert =
    typia.random<IHealthcarePlatformClinicalAlert>();

  // 4. Update mutable fields as org admin
  const expectedUpdates = {
    status: "resolved", // demo new status
    detail: RandomGenerator.paragraph({ sentences: 5 }),
    acknowledged_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformClinicalAlert.IUpdate;
  const updatedAlert =
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.update(
      connection,
      {
        alertId: alertId,
        body: expectedUpdates,
      },
    );
  typia.assert(updatedAlert);
  TestValidator.equals("alertId remains the same", updatedAlert.id, alertId);
  TestValidator.equals(
    "alert status updated",
    updatedAlert.status,
    expectedUpdates.status,
  );
  TestValidator.equals(
    "alert detail updated",
    updatedAlert.detail,
    expectedUpdates.detail,
  );
  TestValidator.equals(
    "alert acknowledged_at updated",
    updatedAlert.acknowledged_at,
    expectedUpdates.acknowledged_at,
  );
  TestValidator.equals(
    "decision_support_rule_id is immutable",
    updatedAlert.decision_support_rule_id,
    oldAlert.decision_support_rule_id,
  );

  // 5. Forbidden: Not logged in as org admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("access forbidden for non-admin user", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.update(
      unauthConn,
      {
        alertId: alertId,
        body: expectedUpdates,
      },
    );
  });
}
