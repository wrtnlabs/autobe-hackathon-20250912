import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployeeComments";

export async function test_api_manager_employee_comments_get_success(
  connection: api.IConnection,
) {
  // 1. Manager joins and authenticates
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // 12 char random alphanumeric password
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Pre-create employee comments by indexing with filters set to null
  const requestBody = {
    search: null,
    employee_id: null,
    evaluation_cycle_id: null,
    page: 1,
    limit: 10,
  } satisfies IJobPerformanceEvalEmployeeComments.IRequest;

  const commentsPage: IPageIJobPerformanceEvalEmployeeComments.ISummary =
    await api.functional.jobPerformanceEval.manager.employeeComments.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(commentsPage);

  // 3. Select the first comment from the page data
  const commentToFetch =
    commentsPage.data.length !== 0 ? commentsPage.data[0] : null;
  TestValidator.predicate(
    "At least one comment is available",
    commentToFetch !== null,
  );

  if (commentToFetch !== null) {
    // 4. Fetch detailed employee comment by ID
    const detailedComment: IJobPerformanceEvalEmployeeComments =
      await api.functional.jobPerformanceEval.manager.employeeComments.at(
        connection,
        {
          id: typia.assert<string & tags.Format<"uuid">>(commentToFetch.id),
        },
      );

    typia.assert(detailedComment);

    // 5. Verify that detailed comment data matches the initial summary
    TestValidator.equals(
      "comment id matches",
      detailedComment.id,
      commentToFetch.id,
    );
    TestValidator.equals(
      "employee_id matches",
      detailedComment.employee_id,
      commentToFetch.employee_id,
    );
    TestValidator.equals(
      "evaluation_cycle_id matches",
      detailedComment.evaluation_cycle_id,
      commentToFetch.evaluation_cycle_id,
    );
    TestValidator.equals(
      "comment content matches",
      detailedComment.comment,
      commentToFetch.comment,
    );
  }
}
