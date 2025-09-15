import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates successful admin profile update and error handling for constraint
 * violations:
 *
 * 1. Create & authenticate a system admin via join API
 * 2. Update profile: change name, is_active, super_admin using update endpoint
 * 3. Check response: all updated fields reflect input, timestamps updated
 * 4. Try updating email to a duplicate value (another admin's email)
 * 5. Assert validation error and proper error handling
 */
export async function test_api_system_admin_update_profile_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate initial system admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Update the admin using their own ID, altering allowed fields
  const updateInput = {
    name: RandomGenerator.name(),
    is_active: false,
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.IUpdate;
  const updated =
    await api.functional.atsRecruitment.systemAdmin.systemAdmins.update(
      connection,
      {
        systemAdminId: adminAuth.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated admin name matches",
    updated.name,
    updateInput.name,
  );
  TestValidator.equals(
    "updated is_active flag",
    updated.is_active,
    updateInput.is_active,
  );
  TestValidator.equals(
    "updated super_admin flag",
    updated.super_admin,
    updateInput.super_admin,
  );
  TestValidator.equals(
    "admin id unchanged after update",
    updated.id,
    adminAuth.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updated.updated_at,
    adminAuth.updated_at,
  );

  // 3. Create a second admin to validate duplicate email constraint
  const otherAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const otherAdminAuth = await api.functional.auth.systemAdmin.join(
    connection,
    { body: otherAdminJoinInput },
  );
  typia.assert(otherAdminAuth);

  // 4. Attempt to update first admin's email to second admin's email (should fail)
  await TestValidator.error("duplicate email update should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.systemAdmins.update(
      connection,
      {
        systemAdminId: adminAuth.id,
        body: {
          email: otherAdminAuth.email,
        } satisfies IAtsRecruitmentSystemAdmin.IUpdate,
      },
    );
  });
}
