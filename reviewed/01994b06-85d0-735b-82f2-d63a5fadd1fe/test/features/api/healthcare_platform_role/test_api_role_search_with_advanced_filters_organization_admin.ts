import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRole";

/**
 * End-to-end scenario to validate organization admin's advanced role search
 * capability.
 *
 * - Create an organization admin account (join) and login to get
 *   authentication.
 * - Use role search API (patch /healthcarePlatform/organizationAdmin/roles)
 *   as authenticated org admin, passing multiple filters:
 *
 *   - By code, scope_type, status, page, and limit.
 * - Verify that:
 *
 *   - Only roles matching organization admin's org/scope and supplied filters
 *       are returned in data[].
 *   - Response pagination has correct current, limit, and records counts.
 *   - Searching with out-of-bounds page returns empty data[].
 *   - Sorting by code or name is honored if supported (if not, verify ordering
 *       by first page).
 * - Test negative scenarios:
 *
 *   - Call search API with no authentication -- expect error.
 *   - (If possible) Call as one org admin but apply forbidden filters for roles
 *       in other org's scope -- expect forbidden/error.
 */
export async function test_api_role_search_with_advanced_filters_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register an organization admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);
  const { email, full_name, phone } = orgAdmin;

  // 2. Logout and login as org admin to ensure authentication
  const loginBody = {
    email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const authResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(authResult);

  // 3. Perform role search with advanced combined filters
  // We'll filter by code=organization_admin (from well-known codes) and status="active"
  // (using first page, small limit to validate pagination)
  const filterBody = {
    code: "organization_admin",
    status: "active",
    page: 0 as number & tags.Type<"int32">,
    limit: 3 as number & tags.Type<"int32">,
  } satisfies IHealthcarePlatformRole.IRequest;
  const page =
    await api.functional.healthcarePlatform.organizationAdmin.roles.index(
      connection,
      { body: filterBody },
    );
  typia.assert(page);
  TestValidator.predicate(
    "all roles returned must have code, status, and belong to allowed scope",
    page.data.every(
      (role) =>
        role.code === "organization_admin" &&
        role.status === "active" &&
        ["organization", "platform", "department"].includes(role.scope_type),
    ),
  );
  TestValidator.predicate(
    "pagination current matches applied page",
    page.pagination.current === filterBody.page,
  );
  TestValidator.predicate(
    "pagination limit matches applied limit",
    page.pagination.limit === filterBody.limit,
  );
  TestValidator.predicate(
    "records count >= data length",
    page.pagination.records >= page.data.length,
  );

  // 4. Out-of-bounds page should return empty results (if pages < 99999)
  const badPageBody = {
    ...filterBody,
    page: 99999 as number & tags.Type<"int32">,
  } satisfies IHealthcarePlatformRole.IRequest;
  const badPage =
    await api.functional.healthcarePlatform.organizationAdmin.roles.index(
      connection,
      { body: badPageBody },
    );
  typia.assert(badPage);
  TestValidator.equals(
    "out-of-bounds page must return empty data",
    badPage.data,
    [],
  );

  // 5. Try to call without authentication (simulate an unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "search roles should fail without auth",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roles.index(
        unauthConn,
        { body: filterBody },
      );
    },
  );

  // 6. (Optional/advanced) Simulate forbidden filter (for another organization's roles)
  // Here, test is limited by current org context so exact org test may not be possible, but we can try an invalid code
  const forbiddenFilterBody = {
    ...filterBody,
    code: "system_admin",
  } satisfies IHealthcarePlatformRole.IRequest;
  const forbiddenRes =
    await api.functional.healthcarePlatform.organizationAdmin.roles.index(
      connection,
      { body: forbiddenFilterBody },
    );
  typia.assert(forbiddenRes);
  // If the system blocks, expect empty or error - here we expect data empty for forbidden/invalid codes
  TestValidator.equals(
    "forbidden/invalid code returns no roles",
    forbiddenRes.data,
    [],
  );
}
