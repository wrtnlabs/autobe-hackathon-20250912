import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validates that an organization admin can create a user-organization
 * assignment.
 *
 * The test flow ensures:
 *
 * 1. Organization admin account registration
 * 2. Organization admin login
 * 3. Simulating existing user and organization IDs
 * 4. Posting to userOrgAssignments with all required fields
 * 5. Validating successful creation, association, and business rule compliance
 * 6. Testing error scenarios for duplicate assignments, permissions, and invalid
 *    roles
 */
export async function test_api_user_org_assignment_orgadmin_create_assignment_success(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Password!1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // 2. Login as organization admin
  const loginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResult);
  // 3. Simulate user and organization IDs
  // (In a real system, you would register a user/org, but only admin join API is available.)
  const user_id = typia.random<string & tags.Format<"uuid">>();
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const role_code = RandomGenerator.pick([
    "clinical_user",
    "organization_staff",
    "organization_admin",
  ] as const);
  // 4. Create a user-org assignment
  const createAssignmentBody = {
    user_id,
    healthcare_platform_organization_id: organization_id,
    role_code,
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: createAssignmentBody,
      },
    );
  typia.assert(assignment);
  // 5. Validate correct association
  TestValidator.equals("user_id should match", assignment.user_id, user_id);
  TestValidator.equals(
    "organization_id should match",
    assignment.healthcare_platform_organization_id,
    organization_id,
  );
  TestValidator.equals(
    "role_code should match",
    assignment.role_code,
    role_code,
  );
  TestValidator.equals(
    "status should be 'active'",
    assignment.assignment_status,
    "active",
  );
  // 6. Duplicate assignments should fail
  await TestValidator.error("duplicate assignment should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: createAssignmentBody,
      },
    );
  });
  // 7. Invalid role should fail
  await TestValidator.error("invalid role_code should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          ...createAssignmentBody,
          role_code: "invalid_role",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  });
  // 8. Assignment outside organization (simulated by new organization_id) should fail
  await TestValidator.error(
    "assignment outside own organization should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
        connection,
        {
          body: {
            user_id,
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            role_code,
            assignment_status: "active",
          } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
        },
      );
    },
  );
}
