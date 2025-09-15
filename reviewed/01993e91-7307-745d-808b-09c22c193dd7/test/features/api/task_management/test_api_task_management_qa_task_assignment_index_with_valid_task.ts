import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";

export async function test_api_task_management_qa_task_assignment_index_with_valid_task(
  connection: api.IConnection,
) {
  // 1. Register QA user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementQa.ICreate;

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: joinBody });
  typia.assert(qaUser);

  // 2. Login QA user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;

  const loginInfo: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: loginBody });
  typia.assert(loginInfo);

  // 3. Prepare valid taskId (usually this comes from a real task; here we emulate)
  const validTaskId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call the PATCH endpoint to retrieve assignments
  const assignments: ITaskManagementTaskAssignmentArray =
    await api.functional.taskManagement.qa.tasks.assignments.indexTaskAssignments(
      connection,
      { taskId: validTaskId },
    );

  typia.assert(assignments);

  // 5. Validation: check each assignment has valid properties and taskId matches
  assignments.data.forEach((assignment) => {
    typia.assert<ITaskManagementTaskAssignment>(assignment);
    TestValidator.predicate(
      `assignment task_id should match requested taskId: ${validTaskId}`,
      assignment.task_id === validTaskId,
    );
    TestValidator.predicate(
      `assignment id should be UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        assignment.id,
      ),
    );
    TestValidator.predicate(
      `assignee_id should be UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        assignment.assignee_id,
      ),
    );
    TestValidator.predicate(
      `assigned_at should be valid ISO datetime`,
      !isNaN(Date.parse(assignment.assigned_at)),
    );
  });

  // 6. Test error case: invalid taskId
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when querying assignments with invalid taskId",
    async () => {
      await api.functional.taskManagement.qa.tasks.assignments.indexTaskAssignments(
        connection,
        { taskId: invalidTaskId },
      );
    },
  );

  // 7. Test unauthorized access - make unauthenticated connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "should fail unauthorized when unauthenticated",
    async () => {
      await api.functional.taskManagement.qa.tasks.assignments.indexTaskAssignments(
        unauthenticatedConn,
        { taskId: validTaskId },
      );
    },
  );
}
