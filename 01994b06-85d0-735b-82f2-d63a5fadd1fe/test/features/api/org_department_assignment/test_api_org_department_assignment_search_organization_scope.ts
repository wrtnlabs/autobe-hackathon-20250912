import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrgDepartmentAssignment";

/**
 * Validate that organization admins can only search their own organization's
 * org-department assignments.
 *
 * - Setup: Create two distinct organizations with separate admin users (adminA
 *   and adminB).
 * - For both organizations, create several org-department assignments with random
 *   but valid department/org IDs.
 * - Log in as adminA.
 * - Search for assignments without filters: Confirm that only adminA's
 *   organization's assignments are listed.
 * - Apply valid department_id filters: Ensure only those department assignments
 *   for adminA's org are listed.
 * - Try to filter using adminB's organization ID: Must yield no results (cannot
 *   see outside org scope).
 * - Log out and log in as adminB: Verify scope is respected for adminB as well.
 * - Test with a random invalid organization_id: Should yield no results, not
 *   error.
 * - Request with no matching departments: Should yield empty data.
 * - Excessive page size (limit): Ensure the API responds with valid page
 *   structure, does not error.
 * - Try unauthorized: Remove auth header, request as guest; expect error.
 */
export async function test_api_org_department_assignment_search_organization_scope(
  connection: api.IConnection,
) {
  // 1. Create two org admins & their orgs
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "TestPassword1!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBodyA,
  });
  typia.assert(adminA);
  const orgIdA = adminA.id;

  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "TestPassword2!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBodyB,
  });
  typia.assert(adminB);
  const orgIdB = adminB.id;

  // 2. Create org-department assignments for both orgs
  const departmentsA = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const assignmentsA: IHealthcarePlatformOrgDepartmentAssignment[] = [];
  for (const dept of departmentsA) {
    const assignment =
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: orgIdA,
            healthcare_platform_department_id: dept,
          },
        },
      );
    typia.assert(assignment);
    assignmentsA.push(assignment);
  }

  const departmentsB = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const assignmentsB: IHealthcarePlatformOrgDepartmentAssignment[] = [];
  for (const dept of departmentsB) {
    const assignment =
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: orgIdB,
            healthcare_platform_department_id: dept,
          },
        },
      );
    typia.assert(assignment);
    assignmentsB.push(assignment);
  }

  // 3. Login as adminA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinBodyA.email,
      password: joinBodyA.password!,
    },
  });

  // 4. Index without filters (should see only orgA assignments)
  let page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: {} },
    );
  typia.assert(page);
  TestValidator.predicate(
    "adminA only sees assignments for their org",
    page.data.every((a) => a.healthcare_platform_organization_id === orgIdA),
  );

  // 5. Filter by department_id (should see only relevant assignment)
  const deptA = departmentsA[0];
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: { healthcare_platform_department_id: deptA } },
    );
  typia.assert(page);
  TestValidator.equals(
    "filtered by department_id only returns orgA assignments with that dept",
    page.data.length,
    assignmentsA.filter((a) => a.healthcare_platform_department_id === deptA)
      .length,
  );

  // 6. Filter by adminB's org_id (should not leak any data)
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: { healthcare_platform_organization_id: orgIdB } },
    );
  typia.assert(page);
  TestValidator.equals(
    "adminA cannot fetch assignments from adminB's org (should be empty)",
    page.data.length,
    0,
  );

  // 7. Login as adminB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinBodyB.email,
      password: joinBodyB.password!,
    },
  });

  // 8. Index as adminB (see only own org)
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: {} },
    );
  typia.assert(page);
  TestValidator.predicate(
    "adminB only sees assignments for their org",
    page.data.every((a) => a.healthcare_platform_organization_id === orgIdB),
  );

  // 9. Filter by random invalid organization_id
  const badOrgId = typia.random<string & tags.Format<"uuid">>();
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: { healthcare_platform_organization_id: badOrgId } },
    );
  typia.assert(page);
  TestValidator.equals(
    "invalid organization_id filter yields empty data",
    page.data.length,
    0,
  );

  // 10. Non-matching department for adminB
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          healthcare_platform_department_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "filtering by non-existent department yields empty data",
    page.data.length,
    0,
  );

  // 11. Excessive limit (pagination)
  page =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
      connection,
      { body: { limit: 1000 } },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination with excessive limit does not error",
    typeof page.pagination.limit === "number" && page.pagination.limit <= 1000,
  );

  // 12. Unauthenticated (as guest)
  const guestConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "guest is forbidden from accessing org-department assignment search",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.index(
        guestConn,
        { body: {} },
      );
    },
  );
}
