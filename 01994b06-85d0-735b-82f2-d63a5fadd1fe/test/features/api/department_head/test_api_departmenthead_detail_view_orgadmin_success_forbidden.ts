import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin's ability to retrieve department head details
 * while enforcing organization boundaries.
 *
 * 1. Onboard and authenticate two organization admins (A and B), ensuring each is
 *    associated with a unique org.
 * 2. Simulate the existence of department heads for each org (random UUIDs stand
 *    in for real department heads).
 * 3. Organization admin A (authenticated):
 *
 *    - Successfully retrieves details for department head presumed to be in A's org
 *    - Receives forbidden or not found error when accessing department head outside
 *         org
 *    - Receives not found error when using a non-existent department head id
 *
 * Prerequisites: There is no department head creation API, so department head
 * IDs are simulated for test logic only.
 *
 * This test verifies org admin authorization boundaries for department head
 * detail view.
 */
export async function test_api_departmenthead_detail_view_orgadmin_success_forbidden(
  connection: api.IConnection,
) {
  // Onboard and login Org Admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Secure!1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);

  // Onboard and login Org Admin B
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Secure!1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminBJoin);

  // Simulated department head IDs (replace with real IDs if available via fixture)
  const deptHeadIdOrgA = typia.random<string & tags.Format<"uuid">>();
  const deptHeadIdOrgB = typia.random<string & tags.Format<"uuid">>();
  const deptHeadIdNonExistent = typia.random<string & tags.Format<"uuid">>();

  // Scenario 1: Retrieve department head for admin A's own org
  try {
    const output: IHealthcarePlatformDepartmentHead =
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.at(
        connection,
        {
          departmentHeadId: deptHeadIdOrgA,
        },
      );
    typia.assert(output);
    TestValidator.equals(
      "should return department head details for own organization",
      output.id,
      deptHeadIdOrgA,
    );
  } catch (exp) {
    throw new Error(
      "Expected success retrieving own organization's department head",
    );
  }

  // Scenario 2: Attempt to view department head from another org (should be forbidden or not found)
  await TestValidator.error(
    "should not allow access to department head in different organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.at(
        connection,
        {
          departmentHeadId: deptHeadIdOrgB,
        },
      );
    },
  );

  // Scenario 3: Attempt to view non-existent department head (should be not found)
  await TestValidator.error(
    "should error for non-existent department head id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.departmentheads.at(
        connection,
        {
          departmentHeadId: deptHeadIdNonExistent,
        },
      );
    },
  );
}
