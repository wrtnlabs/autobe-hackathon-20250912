import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that requesting a nonexistent resource schedule as a system admin
 * returns correct 404 error.
 *
 * 1. Register and authenticate as a system admin (create a fresh sysadmin account
 *    via join, which logs in as well).
 * 2. Attempt to GET a resource schedule with a UUID that does not exist.
 * 3. Assert the API throws an error (must be 404).
 * 4. Optionally, check error message/code presence for business context.
 */
export async function test_api_resource_schedule_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register (and authenticate) as a system admin
  const sysAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminJoin,
    });
  typia.assert(sysAdmin);

  // 2. Try to GET a non-existent resource schedule (random UUID)
  const randomResourceScheduleId = typia.random<string & tags.Format<"uuid">>();
  // 3. The API should throw (not found error for random UUID)
  await TestValidator.error(
    "should throw 404 for nonexistent resource schedule",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.at(
        connection,
        { resourceScheduleId: randomResourceScheduleId },
      );
    },
  );
}
