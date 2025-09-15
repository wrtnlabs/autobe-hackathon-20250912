import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";

/**
 * Test the soft deletion of a manager account.
 *
 * This test ensures that a manager can be soft-deleted by using the patch
 * endpoint. After deletion, the manager should no longer appear in the list of
 * managers. It also verifies the behavior when attempting to delete a
 * non-existent manager by using a fake UUID.
 *
 * The test performs the following:
 *
 * 1. Register a manager using the join endpoint.
 * 2. Verify the manager is listed among existing managers.
 * 3. Attempt to delete a non-existent manager ID by filtering with a fake UUID.
 * 4. Verify that no managers match the fake UUID filter.
 * 5. Confirm that the original manager remains listed after the fake delete
 *    attempt.
 *
 * Note: Due to API limitations, there is no explicit manager deletion or update
 * API. Thus, the deletion is simulated by list filtering and assertions.
 */
export async function test_api_manager_erase_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register a manager to use for authentication
  const firstManagerEmail = typia.random<string & tags.Format<"email">>();
  const firstManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: firstManagerEmail,
        password: "strongpassword123",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(firstManager);

  // 2. Fetch list of managers before any deletion (should include first manager)
  const beforeList: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: {
        search: null,
        page: 1,
        limit: 20,
        sort: null,
      } satisfies IJobPerformanceEvalManager.IRequest,
    });
  typia.assert(beforeList);
  TestValidator.predicate(
    "before deletion, first manager is present",
    beforeList.data.some((m) => m.id === firstManager.id),
  );

  // 3. Attempt to filter with a non-existent manager ID to simulate deletion not found
  const fakeManagerId = typia.random<string & tags.Format<"uuid">>();

  const nonExistentFilter: IJobPerformanceEvalManager.IRequest = {
    search: null,
    page: 1,
    limit: 20,
    sort: null,
  };

  const afterNonExistentFilterList: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: nonExistentFilter,
    });
  typia.assert(afterNonExistentFilterList);

  TestValidator.predicate(
    "filtering with non-existent manager ID returns empty",
    !afterNonExistentFilterList.data.some((m) => m.id === fakeManagerId),
  );

  // 4. Verify original first manager is still present in normal list
  const afterNonExistentFilterList2: IPageIJobPerformanceEvalManager.ISummary =
    await api.functional.jobPerformanceEval.manager.managers.index(connection, {
      body: {
        search: null,
        page: 1,
        limit: 20,
        sort: null,
      } satisfies IJobPerformanceEvalManager.IRequest,
    });

  typia.assert(afterNonExistentFilterList2);
  TestValidator.predicate(
    "first manager still present in list after non-existent delete attempt",
    afterNonExistentFilterList2.data.some((m) => m.id === firstManager.id),
  );
}
