import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsOrganizationadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsOrganizationadmin";

/**
 * This E2E test validates the search functionality for organization
 * administrators by a systemAdmin user in an enterprise LMS system. It
 * covers creating and authenticating a systemAdmin user, creating an
 * organizationAdmin user with the same tenant ID, performing a search with
 * filters and pagination, validating the response, and testing error
 * handling for invalid inputs and unauthorized access.
 *
 * The test ensures tenant scoping is enforced, role-based access is
 * correct, pagination is functioning, and error cases are handled
 * properly.
 */
export async function test_api_systemadmin_search_organizationadmins(
  connection: api.IConnection,
) {
  // 1. Create and authenticate systemAdmin user (join + login).
  // Use random generated data and cache systemAdmin credentials.
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdminAuthorized);
  // User's tenant_id to be used for creation and search of org admins
  typia.assert<string & tags.Format<"uuid">>(systemAdminAuthorized.tenant_id);

  // 2. SystemAdmin login with same credentials
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminAuthorizedLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminAuthorizedLogin);

  // 3. Create organizationAdmin user with tenant_id matching systemAdmin
  const orgAdminCreateBody = {
    tenant_id: systemAdminAuthorized.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdminAuthorized);

  // 4. Perform search for organizationAdmins by systemAdmin user
  // Construct search request body with filters, pagination, tenant scope
  const searchRequestBody = {
    page: 1,
    limit: 10,
    search: orgAdminCreateBody.first_name.substring(0, 3), // partial first_name
    status: "active",
    tenant_id: systemAdminAuthorized.tenant_id,
  } satisfies IEnterpriseLmsOrganizationAdmin.IRequest;

  const searchResult: IPageIEnterpriseLmsOrganizationadmin.ISummary =
    await api.functional.enterpriseLms.systemAdmin.organizationadmins.searchOrganizationAdmins(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  // 5. Validate the response pagination and data content
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data array is non-empty",
    Array.isArray(searchResult.data) && searchResult.data.length > 0,
  );

  // Each listed org admin must have tenant_id matching search tenant_id and status
  for (const admin of searchResult.data) {
    typia.assert(admin);
    TestValidator.equals(
      "matching tenant_id",
      admin.tenant_id,
      systemAdminAuthorized.tenant_id,
    );
    TestValidator.equals("active status", admin.status, "active");
    TestValidator.predicate(
      "search match on first_name or last_name",
      admin.first_name.includes(searchRequestBody.search!) ||
        admin.last_name.includes(searchRequestBody.search!),
    );
  }

  // 6. Attempt sending invalid page parameter and expect error
  await TestValidator.error("invalid page number should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.organizationadmins.searchOrganizationAdmins(
      connection,
      {
        body: {
          ...searchRequestBody,
          page: -1, // invalid page number
        },
      },
    );
  });

  // 7. Test unauthorized access (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.enterpriseLms.systemAdmin.organizationadmins.searchOrganizationAdmins(
      unauthenticatedConnection,
      {
        body: searchRequestBody,
      },
    );
  });
}
