import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsOrganizationadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsOrganizationadmin";

/**
 * This E2E test validates the search operation for organization administrators
 * by an authenticated organization administrator user. The test covers the
 * entire business workflow including user creation/authentication, data seeding
 * for tenant and organization admins, performing paged and filtered searches,
 * validating tenant isolation to prevent cross-tenant data leakage, and testing
 * failure cases with invalid filters.
 *
 * Step 1: OrganizationAdmin user joins via the join API, authenticating and
 * receiving an authorization token. Step 2: Using the authenticated user,
 * create extra organization admins belonging to the same tenant for search
 * testing. Step 3: Call PATCH
 * /enterpriseLms/organizationAdmin/organizationadmins with pagination and
 * search filters. Step 4: Validate the returned list is filtered and paginated
 * correctly with only admins from the authenticated user's tenant. Step 5:
 * Attempt search with invalid filter values to provoke 400 error. Step 6:
 * Confirm unauthorized or cross-tenant data access is prevented (403 on
 * unauthorized, and isolation in results).
 *
 * All API calls are awaited and type assertions using typia are performed.
 * TestValidator functions check business correctness, pagination, tenant
 * isolation, and error handling with descriptive titles.
 */
export async function test_api_organizationadmin_search_organizationadmins_with_valid_filters(
  connection: api.IConnection,
) {
  // 1. OrganizationAdmin user joins and authenticates
  const joinBody1 = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Password1!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedUser = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: joinBody1,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create other admins to test search filtering within the same tenant
  // We create 3 admins total including the authenticated one
  const admins: IEnterpriseLmsOrganizationAdmin.IAuthorized[] = [
    authorizedUser,
  ];

  for (let i = 0; i < 2; i++) {
    const joinBody = {
      tenant_id: authorizedUser.tenant_id,
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password: "Password1!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
    } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
    const admin = await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
    typia.assert(admin);
    admins.push(admin);
  }

  // 3. Perform a search with filters and pagination for the authenticated user's tenant
  const searchRequest = {
    page: 1,
    limit: 2,
    search: authorizedUser.email.substring(0, 3), // partial email search
    status: authorizedUser.status,
    tenant_id: authorizedUser.tenant_id,
  } satisfies IEnterpriseLmsOrganizationAdmin.IRequest;

  const pageResult =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.searchOrganizationAdmins(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // Validate pagination info
  TestValidator.predicate(
    "pagination page >= 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pageResult.pagination.limit === searchRequest.limit,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // Validate all returned admins belong to the tenant
  for (const item of pageResult.data) {
    TestValidator.equals(
      "tenant_id matches",
      item.tenant_id,
      authorizedUser.tenant_id,
    );
  }

  // Validate search filter: emails contain given search substring, case insensitive
  for (const item of pageResult.data) {
    const lowerEmail = item.email.toLowerCase();
    const searchLower = (searchRequest.search ?? "").toLowerCase();
    TestValidator.predicate(
      "email contains search substring",
      lowerEmail.includes(searchLower),
    );
  }

  // 4. Test tenant isolation: create an admin from another tenant
  const joinBodyOtherTenant = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.alphaNumeric(8) + "@example.org",
    password: "Password1!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const otherTenantAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: joinBodyOtherTenant,
    },
  );
  typia.assert(otherTenantAdmin);

  // Search again for original tenant, tenant isolation means otherTenantAdmin is NOT in results
  const pageResult2 =
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.searchOrganizationAdmins(
      connection,
      { body: { ...searchRequest, page: 1, limit: 10 } },
    );
  typia.assert(pageResult2);

  for (const item of pageResult2.data) {
    TestValidator.notEquals(
      "tenant isolation: different tenant admin not included",
      item.id,
      otherTenantAdmin.id,
    );
  }

  // 5. Attempt search with invalid filter to provoke error
  await TestValidator.error(
    "search with invalid status should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.organizationadmins.searchOrganizationAdmins(
        connection,
        {
          body: {
            ...searchRequest,
            status: "invalid_status_that_is_unexpected",
          } satisfies IEnterpriseLmsOrganizationAdmin.IRequest,
        },
      );
    },
  );

  // 6. Confirm unauthorized access returns 403
  // Using empty headers (unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized search must fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.organizationadmins.searchOrganizationAdmins(
      unauthConn,
      { body: searchRequest },
    );
  });
}
