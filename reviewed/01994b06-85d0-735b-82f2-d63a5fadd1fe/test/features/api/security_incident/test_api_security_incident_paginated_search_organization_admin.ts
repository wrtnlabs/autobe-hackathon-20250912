import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSecurityIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformSecurityIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformSecurityIncident";

/**
 * Organization admin paginated security incident search with filters and access
 * control validation.
 *
 * 1. Register a new organization admin (join API).
 * 2. Log in as the created org admin.
 * 3. Perform a search for security incidents of their organization, paginated,
 *    filtered by organization_id and possibly other filters (status,
 *    severity).
 * 4. Ensure results are restricted to their organization.
 * 5. Attempt to search for incidents outside of their scope (another org's id):
 *    should return empty or error.
 * 6. Validate pagination structure and logic (current, limit, records, pages).
 * 7. Attempt without organization_id or with invalid data, check error returned.
 * 8. Check for no-results (e.g., severe filter, fake summary).
 */
export async function test_api_security_incident_paginated_search_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "StrongPassw0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Log in as organization admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(adminLoggedIn);

  // 3A. Search for incidents with organization_id -- should only get incidents in allowed organization
  const searchBody = {
    organization_id: adminLoggedIn.id,
    page: 1,
    page_size: 10,
  } satisfies IHealthcarePlatformSecurityIncident.IRequest;
  const incidents =
    await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.index(
      connection,
      { body: searchBody },
    );
  typia.assert(incidents);
  TestValidator.predicate(
    "all incidents belong to the admin's organization",
    incidents.data.every((inc) => inc.organization_id === adminLoggedIn.id),
  );
  TestValidator.equals(
    "pagination current page",
    incidents.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", incidents.pagination.limit, 10);

  // 3B. Search with a filter that returns empty (e.g., highly unlikely status)
  const emptyIncidents =
    await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.index(
      connection,
      {
        body: {
          organization_id: adminLoggedIn.id,
          status: RandomGenerator.pick(["_NEVER_A_STATUS_"] as const),
          page: 1,
          page_size: 5,
        },
      },
    );
  typia.assert(emptyIncidents);
  TestValidator.equals(
    "no results for impossible filter",
    emptyIncidents.data.length,
    0,
  );

  // 4. Try searching for incidents in another fake org (should be forbidden or return none)
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  if (fakeOrgId !== adminLoggedIn.id) {
    const incidentsOtherOrg =
      await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.index(
        connection,
        {
          body: { organization_id: fakeOrgId, page: 1, page_size: 5 },
        },
      );
    typia.assert(incidentsOtherOrg);
    TestValidator.equals(
      "cannot access other org incidents",
      incidentsOtherOrg.data.length,
      0,
    );
  }

  // 5. Attempt search missing organization_id (should error)
  await TestValidator.error("missing organization_id should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.securityIncidents.index(
      connection,
      { body: { page: 1, page_size: 5 } },
    );
  });
}
