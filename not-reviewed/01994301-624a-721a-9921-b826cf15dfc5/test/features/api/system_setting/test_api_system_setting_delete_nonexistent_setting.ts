import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test deleting a system setting that does not exist as an authenticated
 * administrator.
 *
 * 1. Register a system admin (with unique email, password, name, super_admin).
 * 2. Attempt DELETE /atsRecruitment/systemAdmin/systemSettings/{systemSettingId}
 *    using a random UUID.
 * 3. Validate system returns an error indicating the system setting does not exist
 *    (should be 404 or similar logic error).
 * 4. Confirm that (by business and audit rule) deleting a non-existent setting
 *    does NOT create an audit entry (this only documented, as audit log DTO/API
 *    is unavailable).
 */
export async function test_api_system_setting_delete_nonexistent_setting(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const super_admin = RandomGenerator.pick([true, false] as const);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
        name,
        super_admin,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to delete a non-existent system setting
  const nonexistentSystemSettingId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "delete of non-existent system setting triggers not found error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.systemSettings.erase(
        connection,
        {
          systemSettingId: nonexistentSystemSettingId,
        },
      );
    },
  );
  // 3. (By system expectation, audit log should NOT be triggered on failure; cannot verify directly without API)
}
