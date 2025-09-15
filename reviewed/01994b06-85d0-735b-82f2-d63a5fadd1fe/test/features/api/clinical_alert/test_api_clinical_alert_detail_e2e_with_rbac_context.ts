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
 * Validate clinical alert detail retrieval (GET) with RBAC as system admin.
 *
 * 1. Register (join) a new system admin.
 * 2. Login as that admin to ensure correct session context and authorization.
 * 3. Search for available clinical alerts with PATCH to get a real alertId.
 * 4. Retrieve clinical alert detail via GET using a valid alertId (expect
 *    success).
 * 5. Attempt to retrieve detail using a random, non-existent alertId (expect
 *    error).
 *
 * Test logic:
 *
 * - Ensure detail retrieval for a valid alertId returns correct record and is
 *   typed.
 * - Ensure error thrown for non-existent alertId.
 * - For system admin (global role), RBAC does not restrict cross-org detail; so
 *   only not-found is tested for error scenario.
 */
export async function test_api_clinical_alert_detail_e2e_with_rbac_context(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: email,
    password,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const joinResp = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResp);

  // 2. Login as system admin
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider: "local",
      provider_key: email,
      password,
    },
  });
  typia.assert(loginResp);

  // 3. Search for clinical alerts
  const alertSearchResp =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(alertSearchResp);
  TestValidator.predicate(
    "should have at least one clinical alert to test detail retrieval",
    alertSearchResp.data.length > 0,
  );
  const targetAlert = alertSearchResp.data[0];

  // 4. Retrieve clinical alert detail by alertId (expect success)
  const alertDetail =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.at(
      connection,
      {
        alertId: targetAlert.id,
      },
    );
  typia.assert(alertDetail);
  TestValidator.equals(
    "returned alert detail matches searched alertId",
    alertDetail.id,
    targetAlert.id,
  );

  // 5. Retrieve non-existent alertId (expect error)
  let randomUuid: string & tags.Format<"uuid">;
  do {
    randomUuid = typia.random<string & tags.Format<"uuid">>();
  } while (alertSearchResp.data.some((a) => a.id === randomUuid));
  await TestValidator.error(
    "error thrown for non-existent alertId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.at(
        connection,
        {
          alertId: randomUuid,
        },
      );
    },
  );
}
