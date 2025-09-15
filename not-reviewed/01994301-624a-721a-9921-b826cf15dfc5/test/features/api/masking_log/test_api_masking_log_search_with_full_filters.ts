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
 * E2E validation of system admin ability to search masking logs by actor and
 * target.
 *
 * 1. Register a new admin and authenticate.
 * 2. Simulate (or perform) a masking operation to ensure there is a log present.
 * 3. Use search endpoint with relevant filter fields for masked_by_id and
 *    target_id.
 * 4. Confirm search results match the specific log.
 * 5. Confirm using non-existent id values yields an empty result page (data: []).
 * 6. Check invalid/malformed query structure (bad page values) causes a validation
 *    error.
 * 7. Confirm non-admin attempts to use masking log search fails with an access
 *    error.
 */
export async function test_api_masking_log_search_with_full_filters(
  connection: api.IConnection,
) {
  // 1. Register as system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password,
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(admin);
  // system admin context is now established

  // 2. Simulate creation of a masking log (by searching--if none exist, test relies on simulation/mocked data)
  // To ensure a record exists, we perform a patch with an empty filter to retrieve at least one record
  const initialResult: IPageIAtsRecruitmentMaskingLog.ISummary =
    await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(initialResult);
  TestValidator.predicate(
    "at least one log exists for search test",
    initialResult.data.length > 0,
  );
  const log = initialResult.data[0];

  // 3. Search for masking logs using masked_by_id and target_id filters
  const filtered: IPageIAtsRecruitmentMaskingLog.ISummary =
    await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
      connection,
      {
        body: {
          masked_by_id: log.masked_by_id,
          target_id: log.target_id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filtered);
  // 4. Confirm the correct log is found and all returned records match the filters specified
  TestValidator.predicate(
    "All filtered logs match masked_by_id and target_id",
    filtered.data.every(
      (entry) =>
        entry.masked_by_id === log.masked_by_id &&
        entry.target_id === log.target_id,
    ),
  );
  TestValidator.predicate(
    "filtered data nonempty if known good filter used",
    filtered.data.length > 0,
  );

  // 5. Query with non-existent masked_by_id and target_id yields empty
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const notFound: IPageIAtsRecruitmentMaskingLog.ISummary =
    await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
      connection,
      {
        body: { masked_by_id: nonExistentId, target_id: nonExistentId },
      },
    );
  typia.assert(notFound);
  TestValidator.equals(
    "search for nonexistent log yields empty",
    notFound.data,
    [],
  );

  // 6. Invalid/malformed query (bad page/limit values) triggers validation error
  await TestValidator.error(
    "malformed page/limit triggers validation error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
        connection,
        {
          body: { page: 0, limit: 0 }, // page and limit are Minimum<1>
        },
      );
    },
  );

  // 7. Non-admin cannot use masking log search
  // Simulate an unauthenticated connection by clearing headers (do not modify headers directly)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access masking log search",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.maskingLogs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
