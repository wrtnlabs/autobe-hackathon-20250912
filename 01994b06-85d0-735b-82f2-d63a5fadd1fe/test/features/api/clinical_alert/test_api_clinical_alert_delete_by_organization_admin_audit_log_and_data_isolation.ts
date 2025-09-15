import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * Test organization admin clinical alert deletion with audit, data isolation,
 * and error handling.
 *
 * Validates:
 *
 * - An org admin can delete a clinical alert belonging to their organization
 * - Audit compliance by verifying absence in list after deletion
 * - Cannot delete alerts from another organization (permission enforcement)
 * - Attempt to delete already deleted alert triggers error
 *
 * Steps:
 *
 * 1. Register and login admin 1
 * 2. Find an alert for this admin's organization
 * 3. Delete this alert (success)
 * 4. Confirm alert is deleted (not found in search)
 * 5. Register and login admin 2 (different organization)
 * 6. Try to delete previous alert as admin 2 (permission error)
 * 7. As admin 1, attempt to delete already deleted alert (should error)
 */
export async function test_api_clinical_alert_delete_by_organization_admin_audit_log_and_data_isolation(
  connection: api.IConnection,
) {
  // 1. Register and login admin 1
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin1Email,
        full_name: RandomGenerator.name(),
        password: "admin1password",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1Email,
      password: "admin1password",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Find a clinical alert for admin1's org
  const searchRes1 =
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          organization_id: admin1Join.id,
          page: 1,
          limit: 1,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(searchRes1);
  TestValidator.predicate(
    "alert for this org admin exists",
    searchRes1.data.length > 0,
  );
  const targetAlert = searchRes1.data[0];
  typia.assert(targetAlert);

  // 3. Delete the alert
  await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.erase(
    connection,
    {
      alertId: targetAlert.id,
    },
  );

  // 4. Verify alert is deleted (not in list)
  const searchAfter =
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          organization_id: admin1Join.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(searchAfter);
  TestValidator.predicate(
    "deleted alert is no longer in organization admin search",
    !searchAfter.data.some((a) => a.id === targetAlert.id),
  );

  // 5. Register and login as another org admin
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        password: "admin2password",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin2Email,
      password: "admin2password",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Try to delete alert from org 1 as org 2 admin (should fail)
  await TestValidator.error(
    "organization admin cannot delete alert outside their org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.erase(
        connection,
        {
          alertId: targetAlert.id,
        },
      );
    },
  );

  // 7. Re-login as admin1 and try to delete already deleted alert
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1Email,
      password: "admin1password",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error("cannot delete already deleted alert", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.erase(
      connection,
      {
        alertId: targetAlert.id,
      },
    );
  });
}
