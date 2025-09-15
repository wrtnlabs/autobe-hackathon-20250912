import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserLicenseVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserLicenseVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserLicenseVerification";

/**
 * Test license verification search by organization admin including
 * authorization failures.
 *
 * 1. Register a new organization admin A. Authenticate to establish context.
 * 2. Execute license verification search with org admin credentials:
 *
 *    - Provide organization_id (from admin info).
 *    - Provide a random or default user_id value.
 *    - Validate that a result page object is returned, and typia.assert passes.
 * 3. Register a different organization admin B (different credentials and
 *    org).
 *
 *    - Login as admin B to switch context.
 *    - Attempt to search license verifications for admin A's organization or
 *         with invalid/unauthorized org_id.
 *    - Expect error due to insufficient permissions.
 *    - Use TestValidator.error with descriptive title.
 * 4. For all test steps, strictly use only existing DTOs and API endpoints,
 *    avoid any type error or missing required fields scenarios.
 */
export async function test_api_license_verification_search_by_org_admin_and_role_failure(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin (A)
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "TestPassword1!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);

  // 2. Authenticate as admin A
  const adminALogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminAJoin.email,
        password: "TestPassword1!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminALogin);

  // 3. Search user license verifications with correct org_id
  const searchResult =
    await api.functional.healthcarePlatform.organizationAdmin.userLicenseVerifications.index(
      connection,
      {
        body: {
          organization_id: adminAJoin.id, // Using org admin's ID (simulate organization context)
          user_id: typia.random<string & tags.Format<"uuid">>(), // Random UUID for test
          page: 1 satisfies number as number,
          page_size: 10 satisfies number as number,
        } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "organization admin can retrieve license verifications for own organization",
    searchResult.pagination.current === 1,
  );

  // 4. Register another organization admin (B)
  const adminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "TestPassword2!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminBJoin);

  // 5. Login as admin B
  const adminBLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminBJoin.email,
        password: "TestPassword2!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminBLogin);

  // 6. Attempt search as admin B (should fail due to permission)
  await TestValidator.error(
    "admin B fails to search license verifications for admin A's organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userLicenseVerifications.index(
        connection,
        {
          body: {
            organization_id: adminAJoin.id, // org A's id, not permitted for admin B
            user_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1 satisfies number as number,
            page_size: 10 satisfies number as number,
          } satisfies IHealthcarePlatformUserLicenseVerification.IRequest,
        },
      );
    },
  );
}
