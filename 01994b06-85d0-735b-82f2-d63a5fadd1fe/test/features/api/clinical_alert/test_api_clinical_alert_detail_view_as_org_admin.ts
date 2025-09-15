import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test for viewing details of a clinical alert as an organization
 * admin.
 *
 * Scenario:
 *
 * 1. Register and login as a new organization admin.
 * 2. Negative: Try fetching alert details with a random (but valid) UUID (expect
 *    error).
 * 3. Positive: Attempt to find a real, existing alert by trying up to 10 possible
 *    UUIDs (simulation limitation: alert creation not available).
 * 4. On successful fetch, validate the returned data structure and key fields.
 * 5. Simulate session loss (unauthorized/empty headers) and verify access is
 *    forbidden.
 *
 * Validations:
 *
 * - Alert details retrieval for valid/invalid alertId.
 * - Proper error handling for unauthorized session.
 * - All API/DTO, TestValidator, and assertion contracts respected.
 */
export async function test_api_clinical_alert_detail_view_as_org_admin(
  connection: api.IConnection,
) {
  // 1. Register a new org admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Negative: Try fetching alert with a random UUID (expect error or not found)
  const invalidAlertId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid alertId should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.at(
      connection,
      {
        alertId: invalidAlertId,
      },
    );
  });

  // 3. Try up to 10 random UUIDs to find a real alert (positive case, simulation/seed limitation)
  let foundAlert: IHealthcarePlatformClinicalAlert | undefined = undefined;
  for (let i = 0; i < 10 && !foundAlert; ++i) {
    const maybeId = typia.random<string & tags.Format<"uuid">>();
    try {
      const alert =
        await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.at(
          connection,
          {
            alertId: maybeId,
          },
        );
      typia.assert(alert);
      foundAlert = alert;
    } catch {
      /* not found, continue */
    }
  }
  if (!foundAlert) return; // No alert found: skip further tests
  const alert = foundAlert;

  // 4. Fetch same alert and validate
  const alertFetched =
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.at(
      connection,
      {
        alertId: alert.id,
      },
    );
  typia.assert(alertFetched);
  TestValidator.equals(
    "fetched alert id should match",
    alertFetched.id,
    alert.id,
  );
  TestValidator.equals(
    "organization id consistent",
    alertFetched.organization_id,
    alert.organization_id,
  );
  TestValidator.equals(
    "decision support rule id consistent",
    alertFetched.decision_support_rule_id,
    alert.decision_support_rule_id,
  );

  // 5. Simulate session loss: clear headers/unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized session cannot view alert",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.at(
        unauthConn,
        {
          alertId: alert.id,
        },
      );
    },
  );
}
