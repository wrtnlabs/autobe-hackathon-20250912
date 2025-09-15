import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system administrator can access healthcare platform security
 * incident detail API correctly, and receives expected error for
 * unauthorized/nonexistent incident access.
 *
 * Steps:
 *
 * 1. Register new system admin (POST /auth/systemAdmin/join)
 * 2. Log in as that admin (POST /auth/systemAdmin/login)
 * 3. Access a presumed valid incident by random UUID (GET
 *    /healthcarePlatform/systemAdmin/securityIncidents/{securityIncidentId})
 * 4. Confirm type with typia.assert and business logic checks
 * 5. Try a random non-existent UUID and confirm error is raised
 *    (TestValidator.error)
 * 6. Log out (reset/clear auth) and retry incident detail read to confirm error
 *    (TestValidator.error)
 */
export async function test_api_security_incident_detail_access_as_system_admin(
  connection: api.IConnection,
) {
  // Register a new system admin
  const adminEmail =
    RandomGenerator.name(1).replace(/ /g, "") + "@autobe-test.com";
  const joinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "TestPass!12345",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // Log in as the system admin
  const loginInput = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: "TestPass!12345",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(loggedIn);

  // Presume a valid seeded security incident exists (or simulate)
  const validIncidentId = typia.random<string & tags.Format<"uuid">>();

  // 1. Success: System admin retrieves incident detail
  const incident =
    await api.functional.healthcarePlatform.systemAdmin.securityIncidents.at(
      connection,
      {
        securityIncidentId: validIncidentId,
      },
    );
  typia.assert(incident);
  TestValidator.predicate(
    "incident id matches",
    incident.id === validIncidentId,
  );

  // 2. Error: Nonexistent incident id (random UUID that shouldn't exist)
  await TestValidator.error(
    "should error for nonexistent security incident",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.securityIncidents.at(
        connection,
        {
          securityIncidentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Error: No authentication (remove auth header/simulate unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error for unauthenticated system admin access",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.securityIncidents.at(
        unauthConnection,
        {
          securityIncidentId: validIncidentId,
        },
      );
    },
  );
}
