import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate retrieval of system administrator details by systemAdminId.
 *
 * Steps:
 *
 * 1. Register a new system administrator using the join API, providing random
 *    but valid values for all required fields.
 * 2. Use the returned admin's id as systemAdminId and request detail via GET
 *    /atsRecruitment/systemAdmin/systemAdmins/{systemAdminId}.
 * 3. Assert that all fields in the GET response (id, email, name, super_admin,
 *    is_active, created_at, updated_at, deleted_at) match the registration
 *    and initial state. Use typia.assert for type validation.
 * 4. Attempt to fetch details with a random (non-existent) systemAdminId
 *    (valid UUID not assigned to any account), and expect an error response
 *    (use TestValidator.error).
 * 5. Attempt to fetch details on the endpoint as an unauthenticated
 *    connection, and expect an error (access denied/auth required).
 */
export async function test_api_system_admin_get_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    super_admin: RandomGenerator.pick([true, false] as const),
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;

  const authorized = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(authorized);

  // 2. Retrieve admin details by systemAdminId
  const detail =
    await api.functional.atsRecruitment.systemAdmin.systemAdmins.at(
      connection,
      { systemAdminId: authorized.id },
    );
  typia.assert(detail);

  // 3. Assert core fields match between POST and GET (excluding tokens)
  TestValidator.equals("id matches", detail.id, authorized.id);
  TestValidator.equals("email matches", detail.email, adminInput.email);
  TestValidator.equals("name matches", detail.name, adminInput.name);
  TestValidator.equals(
    "super_admin matches",
    detail.super_admin,
    adminInput.super_admin,
  );
  TestValidator.equals(
    "is_active must be true on registration",
    detail.is_active,
    true,
  );
  // created_at, updated_at: should exist and be valid ISO string, but may differ in microseconds between POST/GET
  typia.assert(detail.created_at);
  typia.assert(detail.updated_at);

  // deleted_at should be null/undefined on a fresh account
  TestValidator.equals(
    "deleted_at must be null or undefined",
    detail.deleted_at ?? null,
    null,
  );

  // 4. Attempt to fetch with an invalid/non-existent systemAdminId (random valid UUID)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  if (fakeId !== detail.id) {
    await TestValidator.error(
      "fetching with invalid systemAdminId must fail",
      async () => {
        await api.functional.atsRecruitment.systemAdmin.systemAdmins.at(
          connection,
          {
            systemAdminId: fakeId,
          },
        );
      },
    );
  }

  // 5. Attempt access as unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin detail fetch must be denied",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemAdmins.at(
        unauthConn,
        { systemAdminId: authorized.id },
      );
    },
  );
}
