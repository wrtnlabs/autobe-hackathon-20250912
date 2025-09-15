import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";

/**
 * Organization admin can retrieve security incident details for their own
 * organization, but not for incidents outside their org or when
 * unauthenticated.
 *
 * This test covers:
 *
 * 1. Onboarding and authenticating an organization admin (OrgA) and a second
 *    admin (OrgB)
 * 2. Mocking (minting) a security incident associated to each admin's
 *    organization
 * 3. Authenticated GET
 *    /healthcarePlatform/organizationAdmin/securityIncidents/{securityIncidentId}
 *    for an incident in OrgA (should succeed)
 * 4. Attempting GET on OrgB's incident with OrgA login (should fail:
 *    forbidden)
 * 5. Attempting GET as unauthenticated (should fail: forbidden or
 *    unauthorized)
 * 6. Validation of incident details and access enforcement
 */
export async function test_api_security_incident_detail_access_as_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as OrgA admin
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAPassword = RandomGenerator.alphaNumeric(10);
  const orgAJoinBody = {
    email: orgAEmail,
    full_name: RandomGenerator.name(),
    password: orgAPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAJoinBody },
  );
  typia.assert(orgAAdmin);

  // 2. Login again to ensure session (simulate flow)
  const orgALogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAEmail,
        password: orgAPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgALogin);

  // 3. Mint (mock) a security incident record for OrgA
  const incidentA = typia.random<IHealthcarePlatformSecurityIncident>();
  incidentA.organization_id = orgAAdmin.id satisfies string as string; // assign matching org
  typia.assert(incidentA);

  // 4. Register and login as OrgB admin; mint incident for OrgB
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBPassword = RandomGenerator.alphaNumeric(10);
  const orgBJoinBody = {
    email: orgBEmail,
    full_name: RandomGenerator.name(),
    password: orgBPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgBAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgBJoinBody },
  );
  typia.assert(orgBAdmin);
  const incidentB = typia.random<IHealthcarePlatformSecurityIncident>();
  incidentB.organization_id = orgBAdmin.id satisfies string as string; // assign matching org
  typia.assert(incidentB);

  // 5. Authenticate OrgA for authorized access
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. GET own incident (success; simulate by calling with incidentA.id)
  const outputA =
    await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.at(
      connection,
      {
        securityIncidentId: incidentA.id,
      },
    );
  typia.assert(outputA);
  TestValidator.equals(
    "incidentA organization id matches admin org",
    outputA.organization_id,
    orgAAdmin.id,
  );
  TestValidator.equals("securityIncidentId matches", outputA.id, incidentA.id);

  // 7. GET incident for OrgB with OrgA login (should fail: forbidden)
  await TestValidator.error(
    "cannot access other organization's incident",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.at(
        connection,
        {
          securityIncidentId: incidentB.id,
        },
      );
    },
  );

  // 8. GET valid incident as unauthenticated (empty headers)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access incident details",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.at(
        unauthConn,
        {
          securityIncidentId: incidentA.id,
        },
      );
    },
  );

  // 9. GET non-existent incident id (random UUID not matching any incident)
  const randomIncidentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "accessing non-existent incident fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.at(
        connection,
        {
          securityIncidentId: randomIncidentId,
        },
      );
    },
  );
}
