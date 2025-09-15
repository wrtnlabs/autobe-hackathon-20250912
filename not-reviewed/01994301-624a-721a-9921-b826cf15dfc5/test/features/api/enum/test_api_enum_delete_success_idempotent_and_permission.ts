import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates system admin can successfully delete an ATS recruitment enum, and
 * that delete is idempotent and permission-restricted.
 *
 * Business context:
 *
 * - Only system admins can delete enum values. Deletion is a soft delete (sets
 *   deleted_at).
 * - Deleting a non-existent or already-deleted enum triggers a proper error
 *   (either idempotent no-op or error response, depending on API contract).
 * - Non-admins must not be able to delete enums at all (requires valid token with
 *   system admin role).
 *
 * Flow:
 *
 * 1. Register and authenticate as system admin.
 * 2. Create a new enum to obtain valid enumId.
 * 3. Delete the enum by valid enumId (should succeed).
 * 4. Repeat deletion to check idempotency (should not cause fatal failure; error
 *    captured if any).
 * 5. Attempt to delete random non-existent enumId (expect error).
 * 6. Try deletion from unauthenticated connection (should be forbidden).
 */
export async function test_api_enum_delete_success_idempotent_and_permission(
  connection: api.IConnection,
) {
  // 1. Register system admin and authenticate (token set by SDK automatically)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(systemAdmin);

  // 2. Create enum as authenticated admin
  const enumBody = {
    enum_type: RandomGenerator.alphaNumeric(10),
    enum_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    extended_data: undefined,
    description: undefined,
  } satisfies IAtsRecruitmentEnum.ICreate;
  const createdEnum =
    await api.functional.atsRecruitment.systemAdmin.enums.create(connection, {
      body: enumBody,
    });
  typia.assert(createdEnum);

  // 3. Delete the enum (success expected)
  await api.functional.atsRecruitment.systemAdmin.enums.erase(connection, {
    enumId: createdEnum.id,
  });

  // 4. Repeat delete for idempotency: should not fail fatally (API-specific error or silent success)
  await TestValidator.error(
    "idempotency: repeated delete on already deleted enumId handled gracefully",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.erase(connection, {
        enumId: createdEnum.id,
      });
    },
  );

  // 5. Deleting non-existent random enumId (should error)
  await TestValidator.error(
    "error on deleting unknown enumId triggers error response",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.erase(connection, {
        enumId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Permission restriction: try erase as unauthenticated/non-admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "permission denied: non-admin cannot delete enum",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.enums.erase(unauthConn, {
        enumId: createdEnum.id,
      });
    },
  );
}
