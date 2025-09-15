import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for verifying organization admin scope in org-department
 * assignment retrieval.
 *
 * 1. Register and authenticate as an organization admin for Organization A.
 * 2. Create org-department assignments for both Organization A and another
 *    Organization B.
 * 3. Fetch by organization admin the assignment that belongs to their
 *    organization (should succeed).
 * 4. Attempt to fetch an assignment belonging to another organization (should
 *    receive forbidden/access denied error).
 * 5. Check error cases for non-existent assignment IDs (should return not
 *    found/bad request).
 * 6. Simulate fetching with no authentication to verify unauthorized error is
 *    thrown.
 */
export async function test_api_org_department_assignment_admin_scope_retrieve_by_id(
  connection: api.IConnection,
) {
  // Step 1: Register as Organization A admin
  const orgA_admin_email = typia.random<string & tags.Format<"email">>();
  const orgA_admin_full_name = RandomGenerator.name();
  const orgA_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_admin_email,
        full_name: orgA_admin_full_name,
        password: "1111",
        phone: null,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_admin);
  const orgA_id = orgA_admin.id;

  // Step 2: Create org-department assignments for Organization A and Organization B
  const orgB_id = typia.random<string & tags.Format<"uuid">>();
  const departmentA_id = typia.random<string & tags.Format<"uuid">>();
  const departmentB_id = typia.random<string & tags.Format<"uuid">>();
  const assignmentA =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgA_id,
          healthcare_platform_department_id: departmentA_id,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
      },
    );
  typia.assert(assignmentA);
  const assignmentB =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgB_id,
          healthcare_platform_department_id: departmentB_id,
        } satisfies IHealthcarePlatformOrgDepartmentAssignment.ICreate,
      },
    );
  typia.assert(assignmentB);

  // Step 3: Retrieve assignment A as Organization A admin (should succeed)
  const readA =
    await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.at(
      connection,
      {
        orgDepartmentAssignmentId: assignmentA.id,
      },
    );
  typia.assert(readA);
  TestValidator.equals("assignmentA data matches", readA.id, assignmentA.id);
  TestValidator.equals(
    "assignmentA organization ID matches",
    readA.healthcare_platform_organization_id,
    orgA_id,
  );
  TestValidator.equals(
    "assignmentA department ID matches",
    readA.healthcare_platform_department_id,
    departmentA_id,
  );

  // Step 4: Attempt to retrieve assignment B as Organization A admin (should be forbidden/not found)
  await TestValidator.error(
    "Access denied or not found for cross-org assignment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.at(
        connection,
        {
          orgDepartmentAssignmentId: assignmentB.id,
        },
      );
    },
  );

  // Step 5: Error checking for non-existent assignment IDs
  await TestValidator.error(
    "Non-existent assignment ID returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.at(
        connection,
        {
          orgDepartmentAssignmentId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // Step 6: Simulate unauthenticated access (empty connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Access denied for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.orgDepartmentAssignments.at(
        unauthConn,
        {
          orgDepartmentAssignmentId: assignmentA.id,
        },
      );
    },
  );
}
