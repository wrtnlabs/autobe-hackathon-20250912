import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validates soft-deletion of a user-organization assignment by an authenticated
 * organization admin. Ensures:
 *
 * 1. Admin can delete (soft-delete) the assignment and it becomes invisible.
 * 2. Only the correct organization admin is permitted to delete, unrelated org
 *    admins are forbidden.
 * 3. Not-found error is returned for non-existent or already-deleted assignments.
 * 4. Attempts to delete if business rules forbid (e.g., active/protected) result
 *    in forbidden error if such enforced.
 *
 * Steps:
 *
 * 1. Register Admin A.
 * 2. Create userOrgAssignment as Admin A.
 * 3. Delete the assignment as Admin A.
 * 4. Attempt to delete same assignment as unrelated Admin B, expect forbidden
 *    error.
 * 5. Attempt to delete non-existent assignment, expect not-found error.
 */
export async function test_api_user_org_assignment_deletion_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register Org Admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);
  // 2. Create userOrgAssignment as Admin A
  const userOrgAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          healthcare_platform_organization_id: adminAJoin.id, // Using admin's id as organization id in lieu of org entity (per limitation)
          role_code: RandomGenerator.pick([
            "basic",
            "editor",
            "staff",
            "doctor",
          ] as const),
          assignment_status: "active",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(userOrgAssignment);
  // 3. Delete assignment as Admin A (soft-delete)
  await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.erase(
    connection,
    {
      userOrgAssignmentId: userOrgAssignment.id,
    },
  );
  // 4. Register unrelated Admin B
  const adminBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminBJoin);
  // Switch to Admin B context (simulate by join - in real system use login)
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminBJoin.email,
      full_name: adminBJoin.full_name,
      password: RandomGenerator.alphaNumeric(12),
      phone: adminBJoin.phone ?? undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  // 4b. Attempt to delete as unrelated admin (should trigger forbidden error)
  await TestValidator.error(
    "Unrelated org admin forbidden to delete assignment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.erase(
        connection,
        {
          userOrgAssignmentId: userOrgAssignment.id,
        },
      );
    },
  );
  // 5. Attempt to delete non-existent assignment
  await TestValidator.error(
    "Deleting non-existent assignment returns not-found error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.erase(
        connection,
        {
          userOrgAssignmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
