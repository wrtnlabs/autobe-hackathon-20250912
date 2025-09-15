import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrgDepartmentAssignment";

/**
 * Test that a system admin can search and filter org-department assignments
 * using supported parameters. Scenario includes verifying the ability to search
 * by organization, department, assignment status, date range, sorting, and
 * pagination. Validate that only authorized (system admin) users can access all
 * records, and verify correct responses to queries, including empty results,
 * pagination handling, and search accuracy. Confirm that unauthorized roles or
 * unauthenticated users cannot access this endpoint (should receive forbidden
 * or unauthorized error).
 */
export async function test_api_org_department_assignment_query_role_based_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: systemAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: systemAdminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(systemAdmin);
  const loginBody = {
    email: systemAdminEmail,
    provider: "local",
    provider_key: systemAdminEmail,
    password: joinBody.password!,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 2. Create several org-dept assignments for searching
  // We'll create 3 with different org/department IDs
  const organizationIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const departmentIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Spread to cover 4 unique assign pairs
  const assignmentInputs = [
    {
      healthcare_platform_organization_id: organizationIds[0],
      healthcare_platform_department_id: departmentIds[0],
    },
    {
      healthcare_platform_organization_id: organizationIds[0],
      healthcare_platform_department_id: departmentIds[1],
    },
    {
      healthcare_platform_organization_id: organizationIds[1],
      healthcare_platform_department_id: departmentIds[0],
    },
  ] as const;

  const assignments: IHealthcarePlatformOrgDepartmentAssignment[] = [];
  for (const input of assignmentInputs) {
    const created =
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.create(
        connection,
        {
          body: input satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
        },
      );
    typia.assert(created);
    assignments.push(created);
  }

  // 3. Query: Search by organization ID (expecting filtered results)
  const orgId = assignmentInputs[0].healthcare_platform_organization_id;
  const byOrgResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(byOrgResult);
  TestValidator.predicate(
    "results only contain assignments with matching organization ID",
    byOrgResult.data.every(
      (a) => a.healthcare_platform_organization_id === orgId,
    ),
  );

  // 4. Query: Search by department ID
  const deptId = assignmentInputs[1].healthcare_platform_department_id;
  const byDeptResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          healthcare_platform_department_id: deptId,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(byDeptResult);
  TestValidator.predicate(
    "results only contain assignments with matching department ID",
    byDeptResult.data.every(
      (a) => a.healthcare_platform_department_id === deptId,
    ),
  );

  // 5. Query: Pagination handling, create more if needed for limit/page
  const totalAssignments = assignments.length;
  const limit = 2,
    page = 1;
  const pagedResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          limit,
          page,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination: limit honored",
    pagedResult.data.length <= limit,
    true,
  );
  TestValidator.equals(
    "pagination: page index correct",
    pagedResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination: limit set correctly",
    pagedResult.pagination.limit,
    limit,
  );

  // 6. Query: Date range filter (created_at_from, created_at_to)
  // Use assignment[0]'s created_at for from, assignment[last]'s created_at for to
  const fromDate = assignments[0].created_at;
  const toDate = assignments[assignments.length - 1].created_at;
  const dateRangeResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "all assignments within created_at date range",
    dateRangeResult.data.every(
      (a) => a.created_at >= fromDate && a.created_at <= toDate,
    ),
  );

  // 7. Query: sorting (by created_at, ascending and descending)
  const ascResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          orderBy: "created_at",
          direction: "asc",
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(ascResult);
  TestValidator.predicate(
    "assignments are sorted by created_at ascending",
    ascResult.data.every(
      (a, i, arr) => i === 0 || a.created_at >= arr[i - 1].created_at,
    ),
  );
  const descResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          orderBy: "created_at",
          direction: "desc",
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(descResult);
  TestValidator.predicate(
    "assignments are sorted by created_at descending",
    descResult.data.every(
      (a, i, arr) => i === 0 || a.created_at <= arr[i - 1].created_at,
    ),
  );

  // 8. Query: Search for empty results (org/department that doesn't exist)
  const nonexistentOrgId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: nonexistentOrgId,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "query for non-existent organization returns empty data",
    emptyResult.data.length,
    0,
  );

  // 9. Query: With no body (should return all or empty)
  const allResult =
    await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "full scan returns at least the number of existing assignments",
    allResult.data.length >= assignments.length,
    true,
  );

  // 10. Security: Try with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search org-department assignments",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.orgDepartmentAssignments.index(
        unauthConn,
        {
          body: {} satisfies IHealthcarePlatformOrgDepartmentAssignment.IRequest,
        },
      );
    },
  );
}
