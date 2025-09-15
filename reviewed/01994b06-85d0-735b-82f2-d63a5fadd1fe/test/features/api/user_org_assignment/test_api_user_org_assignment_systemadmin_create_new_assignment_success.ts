import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * End-to-end test for creating a new user-organization assignment as a
 * system administrator.
 *
 * Business context:
 *
 * - System administrator must be able to assign a user to an organization
 *   with a specific role.
 * - Email must be business (non-personal domain).
 * - Provider must be 'local' for password authentication.
 *
 * Steps:
 *
 * 1. Register a system admin (POST /auth/systemAdmin/join)
 * 2. Login as system admin (POST /auth/systemAdmin/login)
 * 3. Mock organization creation (random UUID)
 * 4. Mock user creation (random UUID)
 * 5. POST /healthcarePlatform/systemAdmin/userOrgAssignments with required
 *    fields
 * 6. Assert that response matches input and is a valid assignment object
 *
 * No negative (type error or field omission) tests included, in line with
 * type-safety and business logic restrictions.
 */
export async function test_api_user_org_assignment_systemadmin_create_new_assignment_success(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@corp-example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Mock org creation (random UUID)
  const organizationId = typia.random<string & tags.Format<"uuid">>();

  // 4. Mock user creation (random UUID)
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create assignment
  const createReq = {
    user_id: userId,
    healthcare_platform_organization_id: organizationId,
    role_code: "sysadmin",
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const assignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: createReq,
      },
    );
  typia.assert(assignment);

  // 6. Assertions
  TestValidator.equals("user_id matches", assignment.user_id, userId);
  TestValidator.equals(
    "organization_id matches",
    assignment.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "role_code matches",
    assignment.role_code,
    createReq.role_code,
  );
  TestValidator.equals(
    "assignment_status matches",
    assignment.assignment_status,
    createReq.assignment_status,
  );
  TestValidator.predicate(
    "assignment object has non-empty id",
    typeof assignment.id === "string" && assignment.id.length > 0,
  );
  TestValidator.predicate(
    "assignment.created_at is ISO timestamp",
    typeof assignment.created_at === "string" &&
      assignment.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "assignment.updated_at is ISO timestamp",
    typeof assignment.updated_at === "string" &&
      assignment.updated_at.endsWith("Z"),
  );
}
