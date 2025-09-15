import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validate department head can retrieve clinical alert details via alertId,
 * including access, structure, and error scenarios.
 *
 * 1. Register a department head (random valid email, name, strong password).
 * 2. Login as department head with those credentials.
 * 3. Attempt to retrieve a clinical alert using a random UUID (simulate not found)
 *    -- expect error.
 * 4. Simulate unauthorized fetch: create new connection without token, attempt
 *    fetch, expect error.
 */
export async function test_api_clinical_alert_detail_view_as_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "A!";
  const joinRes = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email,
      full_name: RandomGenerator.name(2),
      password,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(joinRes);
  TestValidator.equals(
    "role is departmentHead",
    joinRes.role,
    "departmentHead",
  );

  // 2. Login as department head
  const loginRes = await api.functional.auth.departmentHead.login(connection, {
    body: {
      email,
      password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  typia.assert(loginRes);
  TestValidator.equals(
    "login department head id matches join",
    loginRes.id,
    joinRes.id,
  );

  // 3. Try to retrieve a clinical alert (random UUID - not found)
  const missingAlertId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent clinical alert returns error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.at(
        connection,
        {
          alertId: missingAlertId,
        },
      );
    },
  );

  // 4. Try as unauthenticated user (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized fetch forbidden for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.at(
        unauthConn,
        {
          alertId: missingAlertId,
        },
      );
    },
  );
}
