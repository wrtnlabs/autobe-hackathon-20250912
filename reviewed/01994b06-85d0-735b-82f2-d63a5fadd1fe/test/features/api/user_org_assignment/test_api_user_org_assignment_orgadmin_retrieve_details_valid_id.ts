import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * E2E test for retrieving user-organization assignment details as an
 * organization administrator.
 *
 * This test verifies the following workflow:
 *
 * 1. Organization admin is registered (join) with random email and basic info.
 * 2. Organization admin logs in using email/password.
 * 3. Mock user_id and organization_id (typia random UUIDs), as only assignment
 *    creation endpoint is present.
 * 4. Assignment is created using the random IDs, random role and status.
 * 5. That assignment is fetched by ID and all fields are validated for
 *    correctness.
 * 6. An attempt to fetch a non-existent assignmentId should fail (error tested).
 *
 * Delete and unauthorized edge-cases cannot be tested, as those endpoints are
 * not present in the available API.
 */
export async function test_api_user_org_assignment_orgadmin_retrieve_details_valid_id(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassw0rd!";
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);

  // 2. Login as the admin
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);

  // 3. Prepare random (but valid) user and organization ids
  const user_id = typia.random<string & tags.Format<"uuid">>();
  const healthcare_platform_organization_id = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create assignment
  const role_code = RandomGenerator.pick([
    "member",
    "admin",
    "viewer",
  ] as const);
  const assignment_status = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);
  const assignmentBody = {
    user_id,
    healthcare_platform_organization_id,
    role_code,
    assignment_status,
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const createResp =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      { body: assignmentBody },
    );
  typia.assert(createResp);

  // 5. Retrieve assignment by ID and verify all fields
  const details =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.at(
      connection,
      { userOrgAssignmentId: createResp.id },
    );
  typia.assert(details);
  TestValidator.equals("assignment id matches", details.id, createResp.id);
  TestValidator.equals("user_id matches", details.user_id, user_id);
  TestValidator.equals(
    "organization id matches",
    details.healthcare_platform_organization_id,
    healthcare_platform_organization_id,
  );
  TestValidator.equals("role_code matches", details.role_code, role_code);
  TestValidator.equals(
    "assignment_status matches",
    details.assignment_status,
    assignment_status,
  );
  TestValidator.predicate("created_at is defined", !!details.created_at);
  TestValidator.predicate("updated_at is defined", !!details.updated_at);
  TestValidator.equals(
    "deleted_at is null or undefined",
    details.deleted_at,
    null,
  );

  // 6. Retrieve non-existent assignment (should error)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent assignmentId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.at(
        connection,
        { userOrgAssignmentId: nonExistentId },
      );
    },
  );
}
