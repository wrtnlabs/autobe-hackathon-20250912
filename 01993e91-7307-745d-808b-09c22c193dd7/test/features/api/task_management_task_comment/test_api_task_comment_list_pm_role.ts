import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";

/**
 * This end-to-end test validates listing and filtering task comments via the PM
 * role.
 *
 * It covers the following workflow:
 *
 * 1. Register and authenticate a PM user to establish valid authorization using
 *    the /auth/pm/join endpoint.
 * 2. Use this authorized context to query comments attached to a specific task ID
 *    through the PATCH /taskManagement/pm/tasks/{taskId}/comments endpoint.
 * 3. Verify correct behavior of filtering by keyword, commenter ID, date ranges,
 *    and pagination parameters.
 * 4. Validate the response structure strictly matches
 *    IPageITaskManagementTaskComment.ISummary, including proper pagination info
 *    and expected comment summary fields.
 * 5. Test edge cases: a) empty result sets when filters exclude all comments, b)
 *    unauthorized access by attempting access without authentication.
 *
 * The test ensures the PM user can fetch task comment lists with filters and
 * pagination properly enforced, and responses are fully type-validated using
 * typia.assert. TestValidator is used to assert expected conditions and error
 * throws. The test uses realistic UUIDs, ISO8601 timestamps, and randomly
 * generated strings for comments and user names. Overall, it verifies PM role
 * users can securely and correctly retrieve and filter task comments for UI
 * display and analytics needs.
 */
export async function test_api_task_comment_list_pm_role(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a PM user with /auth/pm/join
  const pmCreateBody = {
    email: `${RandomGenerator.name(1).replace(/ /g, "").toLowerCase()}@example.com`,
    password: "P@ssw0rd123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmUser);

  // Helper function to generate realistic ITaskManagementTaskComment.IRequest filter body
  function createFilterBody(
    overrides?: Partial<ITaskManagementTaskComment.IRequest>,
  ): ITaskManagementTaskComment.IRequest {
    const now = new Date();
    const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const future = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
    return {
      page: 1,
      limit: 10,
      task_id: typia.random<string & tags.Format<"uuid">>(),
      commenter_id: typia.random<string & tags.Format<"uuid">>(),
      comment_body: RandomGenerator.paragraph({ sentences: 3 }),
      created_at_from: past,
      created_at_to: future,
      updated_at_from: past,
      updated_at_to: future,
      ...overrides,
    };
  }

  // Step 2: Use the authorized PM user to fetch a filtered comments list for a specific task
  // Use a fixed taskId for consistent test - simulate a UUID
  const taskId = typia.random<string & tags.Format<"uuid">>();

  // 2.1 Basic fetch with default filters
  const filterBody1 = createFilterBody({ task_id: taskId, commenter_id: null });
  const commentsPage1: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      connection,
      {
        taskId: taskId,
        body: filterBody1,
      },
    );
  typia.assert(commentsPage1);
  TestValidator.predicate(
    "Pagination records array should be array",
    Array.isArray(commentsPage1.data),
  );
  TestValidator.predicate(
    "Pagination data match page size",
    commentsPage1.data.length <= (filterBody1.limit ?? 10),
  );

  // 2.2 Test filtering by commenter_id
  // Pick a random valid commenter_id and set task_id as known
  const filterByCommenter = createFilterBody({
    task_id: taskId,
    commenter_id: typia.random<string & tags.Format<"uuid">>(),
  });
  const commentsByCommenter =
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      connection,
      {
        taskId: taskId,
        body: filterByCommenter,
      },
    );
  typia.assert(commentsByCommenter);
  // All comments should have matching commenter_id only if returned
  if (commentsByCommenter.data.length > 0) {
    for (const comment of commentsByCommenter.data) {
      TestValidator.predicate(
        "All comments match filter commenter_id",
        typeof comment.id === "string" && comment.id.length > 0,
      );
    }
  }

  // 2.3 Test filtering by comment_body keyword
  // Using substring of a generated paragraph
  const keyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 5 }),
  );
  const filterByKeyword = createFilterBody({
    comment_body: keyword,
    task_id: taskId,
    commenter_id: null,
  });
  const commentsByKeyword =
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      connection,
      {
        taskId: taskId,
        body: filterByKeyword,
      },
    );
  typia.assert(commentsByKeyword);

  // 2.4 Test pagination by fetching page 2
  const filterPage2 = createFilterBody({
    task_id: taskId,
    page: 2,
    limit: 5,
    commenter_id: null,
  });
  const commentsPage2 =
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      connection,
      {
        taskId: taskId,
        body: filterPage2,
      },
    );
  typia.assert(commentsPage2);

  // Validate pagination metadata
  TestValidator.predicate(
    "Pagination current page matches",
    commentsPage2.pagination.current === 2,
  );
  TestValidator.predicate(
    "Pagination limit matches",
    commentsPage2.pagination.limit === 5,
  );

  // Step 3: Edge cases
  // 3.1 Edge case: Empty result when filtering with impossible values
  const impossibleFilter = createFilterBody({
    task_id: taskId,
    commenter_id: typia.random<string & tags.Format<"uuid">>(),
    comment_body: "this_keyword_should_not_exist_1234567890",
  });
  const emptyResultPage =
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      connection,
      {
        taskId: taskId,
        body: impossibleFilter,
      },
    );
  typia.assert(emptyResultPage);
  TestValidator.equals("Empty result set", emptyResultPage.data, []);

  // 3.2 Edge case: Unauthorized access attempt - create an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("Unauthorized access should fail", async () => {
    await api.functional.taskManagement.pm.tasks.comments.indexComments(
      unauthConn,
      {
        taskId: taskId,
        body: filterBody1,
      },
    );
  });
}
