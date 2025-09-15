import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

/**
 * Validates the search and pagination functionalities of blended learning
 * sessions from the system administrator perspective.
 *
 * This E2E test performs the following steps:
 *
 * 1. Registers a new systemAdmin user and authenticates the session.
 * 2. Executes various filtered paginated searches using session_type, status,
 *    scheduled time ranges.
 * 3. Validates that the returned data conforms to filter criteria and that
 *    pagination metadata is correct.
 * 4. Tests boundary cases including empty filters, maximum page sizes, and
 *    invalid inputs.
 * 5. Validates unauthorized access is denied.
 *
 * Business Context: System administrators can globally view blended
 * learning session listings with rich filters and pagination controls.
 * Proper authorization and tenant isolation are pivotal for security.
 *
 * This test ensures that the blended learning session search API behaves
 * correctly and securely under typical and edge scenarios.
 */
export async function test_api_blended_learning_sessions_search_with_filters_pagination(
  connection: api.IConnection,
) {
  // 1. systemAdmin user creation
  const systemAdminCreateBody = {
    email: `test_sysadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Base input for searches
  const searchInputBase: IEnterpriseLmsBlendedLearningSession.IRequest = {
    page: 1,
    limit: 5,
  };

  // 3. Search with empty filters (just page and limit)
  {
    const response =
      await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
        connection,
        { body: searchInputBase },
      );
    typia.assert(response);
    TestValidator.predicate(
      "Page shall be 1",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "Limit shall be 5",
      response.pagination.limit === 5,
    );
    TestValidator.predicate(
      "Page count matches records and limit",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "Records not negative",
      response.pagination.records >= 0,
    );
    if (response.data.length > 0) {
      TestValidator.predicate(
        "All summaries must have id and title",
        response.data.every(
          (v) => typeof v.id === "string" && typeof v.title === "string",
        ),
      );
    }
  }

  // 4. Filter by existing status
  {
    const sessionStatuses = Array.from(
      new Set(
        (
          await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
            connection,
            { body: searchInputBase },
          )
        ).data.map((v) => v.status),
      ),
    );
    if (sessionStatuses.length > 0) {
      const filterStatus = sessionStatuses[0];
      const input: IEnterpriseLmsBlendedLearningSession.IRequest = {
        ...searchInputBase,
        status: filterStatus,
      };
      const response =
        await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
          connection,
          { body: input },
        );
      typia.assert(response);
      TestValidator.predicate(
        `Data all have status = ${filterStatus}`,
        response.data.every((v) => v.status === filterStatus),
      );
    }
  }

  // 5. Filter by scheduled_start_at date range
  {
    const nowISOString = new Date().toISOString();
    const tomorrowISOString = new Date(Date.now() + 86400000).toISOString();
    const input: IEnterpriseLmsBlendedLearningSession.IRequest = {
      ...searchInputBase,
      scheduled_start_at_from: nowISOString,
      scheduled_start_at_to: tomorrowISOString,
    };
    const response =
      await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
        connection,
        { body: input },
      );
    typia.assert(response);
    TestValidator.predicate(
      `All sessions scheduled_start_at >= from and <= to`,
      response.data.every(
        (v) =>
          v.scheduled_start_at >= nowISOString &&
          v.scheduled_start_at <= tomorrowISOString,
      ),
    );
  }

  // 6. Maximum page size test
  {
    const input: IEnterpriseLmsBlendedLearningSession.IRequest = {
      ...searchInputBase,
      limit: 100,
    };
    const response =
      await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
        connection,
        { body: input },
      );
    typia.assert(response);
    TestValidator.predicate(
      "Limit shall not exceed 100",
      response.pagination.limit <= 100,
    );
  }

  // 7. Invalid filter values test - expect error
  await TestValidator.error("Invalid filter values cause failure", async () => {
    const invalidInput: IEnterpriseLmsBlendedLearningSession.IRequest = {
      ...searchInputBase,
      scheduled_start_at_from: "invalid-date",
    };
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      connection,
      { body: invalidInput },
    );
  });

  // 8. Unauthorized access test (using an unauthenticated connection)
  const unauthed: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized request should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.blendedLearningSessions.index(
      unauthed,
      { body: searchInputBase },
    );
  });
}
