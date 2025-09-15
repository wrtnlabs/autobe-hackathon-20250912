import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAccessLog";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the retrieval of a specific system admin access log detail.
 *
 * This test ensures that:
 *
 * 1. System admin authentication is required for access log retrieval.
 * 2. When a known valid accessLogId is provided, GET
 *    /atsRecruitment/systemAdmin/accessLogs/{accessLogId} returns all
 *    business/audit fields as expected.
 * 3. Querying with a valid but non-existent UUID triggers not found/error.
 * 4. Non-admin (unauthenticated) requests are forbidden.
 *
 * Test Process:
 *
 * 1. Register a new system admin (random email/password/name, flag super_admin
 *    random T/F).
 * 2. Prepare a (simulated) existing access log UUID (random, because no create
 *    endpoint for logs is given).
 * 3. Fetch access log detail (as admin).
 * 4. Validate type + content (presence of key fields, audit/biz fields, optional
 *    fields).
 * 5. Attempt with valid but non-existent UUID (should error).
 * 6. Attempt with unauthenticated (should error).
 */
export async function test_api_system_admin_access_log_detail(
  connection: api.IConnection,
) {
  // 1. Authenticate as system admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    super_admin: RandomGenerator.pick([true, false] as const),
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Prepare a valid accessLogId (simulate as random UUID for testability)
  const validAccessLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch log (as authenticated system admin) -- expect success
  const log = await api.functional.atsRecruitment.systemAdmin.accessLogs.at(
    connection,
    {
      accessLogId: validAccessLogId,
    },
  );
  typia.assert(log);
  TestValidator.equals("log.id matches requested", log.id, validAccessLogId);

  // Check all required fields for business/audit traceability
  TestValidator.predicate(
    "log.actor_id is present",
    typeof log.actor_id === "string" && log.actor_id.length > 0,
  );
  TestValidator.predicate(
    "log.actor_type is present",
    typeof log.actor_type === "string" && log.actor_type.length > 0,
  );
  TestValidator.predicate(
    "log.target_type is present",
    typeof log.target_type === "string" && log.target_type.length > 0,
  );
  TestValidator.predicate(
    "log.target_id is present",
    typeof log.target_id === "string" && log.target_id.length > 0,
  );
  TestValidator.predicate(
    "log.accessed_at is present",
    typeof log.accessed_at === "string" && log.accessed_at.length > 0,
  );

  // 4. Fetch with a valid but non-existent UUID (should error)
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent accessLogId should return error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.accessLogs.at(
        connection,
        {
          accessLogId: nonExistentLogId,
        },
      );
    },
  );

  // 5. Fetch as unauthenticated (should error/forbidden)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin forbidden", async () => {
    await api.functional.atsRecruitment.systemAdmin.accessLogs.at(unauthConn, {
      accessLogId: validAccessLogId,
    });
  });
}
