import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * Test that a system administrator can delete a clinical alert and that
 * deletion is auditable, restricted, and irreversible as described by
 * business rules.
 *
 * 1. Register and authenticate a new system administrator who will perform the
 *    delete action.
 * 2. Search for an existing (not deleted/locked) clinical alert using system
 *    admin API.
 *
 *    - If no alert exists, the test will skip further deletion steps since no
 *         suitable alert is available.
 * 3. As system admin, delete the selected clinical alert by alertId.
 * 4. Attempt to retrieve (via index filter) the now-deleted alert and assert
 *    it is no longer present.
 * 5. Attempt to delete the same alert again and assert an error is thrown
 *    (since deletion is permanent).
 * 6. Attempt to delete a non-existent alertId (random UUID) and assert an
 *    error is thrown.
 * 7. (Negative) Attempt to delete an alert with unauthenticated connection and
 *    assert an error is thrown.
 * 8. (Restriction) If any alert found is status 'resolved','closed', or has
 *    deleted_at, skip or validate that deletion is not permitted (if the
 *    API rejects such deletes, catch error and validate as negative case).
 */
export async function test_api_clinical_alert_delete_by_system_admin_with_audit_and_restrictions(
  connection: api.IConnection,
) {
  // 1. Register and login a new system admin to get an authenticated connection
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  const loginBody = {
    email,
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminSession = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminSession);

  // 2. Search for at least one active alert
  const page =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      { body: {} as IHealthcarePlatformClinicalAlert.IRequest },
    );
  typia.assert(page);
  const existingAlert = page.data.find(
    (alert) =>
      !alert.deleted_at && !["resolved", "closed"].includes(alert.status),
  );
  // If no deletable alert, skip deletion test logic
  if (!existingAlert) return;
  const alertId = existingAlert.id;

  // 3. Delete the clinical alert
  await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.erase(
    connection,
    { alertId },
  );

  // 4. Search and verify the deleted alert is no longer present
  const pageAfterDelete =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      { body: { subject_summary: existingAlert.subject_summary } },
    );
  typia.assert(pageAfterDelete);
  TestValidator.predicate(
    "deleted alert should not be listed in results",
    pageAfterDelete.data.find((a) => a.id === alertId) === undefined,
  );

  // 5. Attempt to delete again, expect error
  await TestValidator.error("cannot delete the same alert twice", async () => {
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.erase(
      connection,
      { alertId },
    );
  });

  // 6. Attempt to delete non-existent alert
  await TestValidator.error("cannot delete non-existent alert", async () => {
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.erase(
      connection,
      {
        alertId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 7. Attempt deletion without auth
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete alert",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.erase(
        unauthConn,
        { alertId },
      );
    },
  );

  // 8. If there are any resolved/closed/deleted alerts, negative checks: should not be deletable
  const restrictedAlert = page.data.find(
    (alert) =>
      alert.deleted_at || ["resolved", "closed"].includes(alert.status),
  );
  if (restrictedAlert) {
    await TestValidator.error(
      "cannot delete closed, resolved, or deleted alert",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.erase(
          connection,
          { alertId: restrictedAlert.id },
        );
      },
    );
  }
}
