import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentMaskingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentMaskingLog";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentMaskingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentMaskingLog";

/**
 * E2E test verifying detailed retrieval of a data masking log as a system
 * administrator.
 *
 * Steps:
 *
 * 1. Register and authenticate as a system administrator.
 * 2. Create a masking event and ensure the log is generated.
 * 3. Retrieve the masking log list and pick a valid maskingLogId.
 * 4. Fetch the detail for the maskingLogId and validate all audit fields and
 *    structure.
 * 5. Attempt to access with an invalid maskingLogId (should fail gracefully).
 * 6. Attempt to access as unauthenticated (should deny access).
 */
export async function test_api_masking_log_detail_access_by_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a system admin
  const sysAdminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminInput,
  });
  typia.assert(sysAdmin);

  // 2. Initiate a masking log (ensure at least one exists via search)
  await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
    connection,
    {
      body: {},
    },
  );

  // 3. Retrieve a list of masking logs to obtain a valid maskingLogId
  const maskLogList =
    await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(maskLogList);
  TestValidator.predicate(
    "Should retrieve at least one masking log after event",
    maskLogList.data.length > 0,
  );
  const maskingLogId = typia.assert(maskLogList.data[0].id!);

  // 4. Fetch masking log detail by ID
  const detail = await api.functional.atsRecruitment.systemAdmin.maskingLogs.at(
    connection,
    {
      maskingLogId,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "Returned maskingLogId matches",
    detail.id,
    maskingLogId,
  );
  TestValidator.equals(
    "Actor type is systemAdmin",
    detail.masked_by_type,
    "systemAdmin",
  );
  TestValidator.predicate(
    "Audit fields check",
    typeof detail.masked_at === "string" &&
      typeof detail.target_id === "string" &&
      typeof detail.target_type === "string" &&
      typeof detail.masking_reason === "string",
  );

  // 5. Attempt to access non-existent maskingLogId
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should not find non-existent maskingLogId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.maskingLogs.at(
        connection,
        {
          maskingLogId: fakeId,
        },
      );
    },
  );

  // 6. Attempt as unauthenticated (simulate by new connection object with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Non-admin access is denied", async () => {
    await api.functional.atsRecruitment.systemAdmin.maskingLogs.at(unauthConn, {
      maskingLogId,
    });
  });
}
