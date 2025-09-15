import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validate system admin retrieval of user-organization assignment details.
 *
 * 1. Register a system admin (join) and login to set JWT context
 * 2. Create a user-organization assignment (requires a user ID and org ID)
 * 3. Retrieve assignment details by ID; expect all fields to be present
 * 4. Validate returned fields match created assignment (id, user_id, org_id, role,
 *    status)
 * 5. Test not found error (random/invalid userOrgAssignmentId)
 */
export async function test_api_user_org_assignment_systemadmin_retrieve_details_valid_id(
  connection: api.IConnection,
) {
  // 1. Register a system admin (local provider for password logic)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: "Abc123!@#",
      },
    });
  typia.assert(adminJoin);

  // 2. Login as system admin (to ensure token is active)
  const adminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        provider: "local",
        provider_key: adminEmail,
        password: "Abc123!@#",
      },
    });
  typia.assert(adminLogin);

  // Prepare fake UUIDs for user and org (simulate external provision)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const roleCode = RandomGenerator.pick([
    "admin",
    "staff",
    "viewer",
    "doctor",
    "nurse",
  ] as const);
  const assignmentStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);

  // 3. Create user-org assignment
  const assignmentCreateBody = {
    user_id: userId,
    healthcare_platform_organization_id: orgId,
    role_code: roleCode,
    assignment_status: assignmentStatus,
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;

  const createdAssignment: IHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      {
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);
  TestValidator.equals("user_id matches", createdAssignment.user_id, userId);
  TestValidator.equals(
    "org_id matches",
    createdAssignment.healthcare_platform_organization_id,
    orgId,
  );
  TestValidator.equals(
    "role_code matches",
    createdAssignment.role_code,
    roleCode,
  );
  TestValidator.equals(
    "assignment_status matches",
    createdAssignment.assignment_status,
    assignmentStatus,
  );
  TestValidator.predicate(
    "id is uuid",
    typeof createdAssignment.id === "string" &&
      createdAssignment.id.length >= 32,
  );

  // 4. Retrieve assignment by id
  const retrieved: IHealthcarePlatformUserOrgAssignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.at(
      connection,
      {
        userOrgAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved assignment matches created",
    retrieved,
    createdAssignment,
    (key) => ["created_at", "updated_at"].includes(key),
  );

  // 5. Attempt to retrieve non-existent assignment (random uuid should be error)
  await TestValidator.error(
    "not found error for non-existent assignment id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.at(
        connection,
        {
          userOrgAssignmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
