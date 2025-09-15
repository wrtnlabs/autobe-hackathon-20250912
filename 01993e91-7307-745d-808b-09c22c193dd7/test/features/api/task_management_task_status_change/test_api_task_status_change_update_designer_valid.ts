import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";

/**
 * This E2E test validates the update of a task status change by a Designer
 * user, ensuring the role's ability to modify task status changes. The test
 * covers the full scenario of registration, authentication, dependency setup,
 * status change creation, and update execution.
 *
 * Steps:
 *
 * 1. Register and login as Designer user
 * 2. Register and login as PMO user
 * 3. Create a task status for status changes
 * 4. Create a project associated with the PMO user
 * 5. Create a task linked to the project and created status
 * 6. Create a task status change by Designer
 * 7. Update the task status change by Designer with a new status and comment
 * 8. Validate that the update reflects and is persisted
 * 9. Test failure cases for unauthorized update by PMO
 * 10. Test failure for invalid statusChangeId
 * 11. Test failure for invalid new_status_id
 */
export async function test_api_task_status_change_update_designer_valid(
  connection: api.IConnection,
) {
  // 1. Designer user registration
  const designerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(24),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreateBody,
    });
  typia.assert(designer);

  // 2. Designer user login
  const designerLoginBody = {
    email: designer.email,
    password: designerCreateBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;

  const designerLoggedIn: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLoggedIn);

  // 3. PMO user registration
  const pmoCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(24),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmo: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoCreateBody });
  typia.assert(pmo);

  // 4. PMO user login
  const pmoLoginBody = {
    email: pmo.email,
    password: pmoCreateBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoggedIn);

  // 5. Create a task status
  const taskStatusCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const createdStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusCreateBody },
    );
  typia.assert(createdStatus);

  // 6. Create a project
  const projectCreateBody = {
    owner_id: pmo.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;

  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);

  // 7. Create a task with PMO user
  // We use the createdStatus.id as the status_id
  const taskCreateBody = {
    status_id: createdStatus.id,
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmo.id,
    project_id: createdProject.id,
    title: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTask.ICreate;

  const createdTask: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(createdTask);

  // Switch authenticated user context to designer user
  await api.functional.auth.designer.login(connection, {
    body: designerLoginBody,
  });

  // 8. Create initial status change for the task by designer
  const statusChangeCreateBody = {
    task_id: createdTask.id,
    new_status_id: createdStatus.id,
    changed_at: new Date().toISOString(),
    comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementTaskStatusChange.ICreate;

  const createdStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.designer.tasks.statusChanges.create(
      connection,
      {
        taskId: createdTask.id,
        body: statusChangeCreateBody,
      },
    );
  typia.assert(createdStatusChange);

  // 9. Create another status for updating
  const newStatusCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementTaskStatus.ICreate;

  const newStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      { body: newStatusCreateBody },
    );
  typia.assert(newStatus);

  // 10. Update the task status change with new status and comment
  const statusChangeUpdateBody = {
    new_status_id: newStatus.id,
    comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatusChange.IUpdate;

  const updatedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.designer.tasks.statusChanges.update(
      connection,
      {
        taskId: createdTask.id,
        statusChangeId: createdStatusChange.id,
        body: statusChangeUpdateBody,
      },
    );
  typia.assert(updatedStatusChange);

  TestValidator.equals(
    "updated new_status_id equals",
    updatedStatusChange.new_status_id,
    statusChangeUpdateBody.new_status_id,
  );

  TestValidator.equals(
    "updated comment equals",
    updatedStatusChange.comment,
    statusChangeUpdateBody.comment,
  );

  // 11. Failure case: Unauthorized update by PMO user
  await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });

  await TestValidator.error(
    "update rejected for unauthorized PMO user",
    async () => {
      await api.functional.taskManagement.designer.tasks.statusChanges.update(
        connection,
        {
          taskId: createdTask.id,
          statusChangeId: createdStatusChange.id,
          body: statusChangeUpdateBody,
        },
      );
    },
  );

  // 12. Failure case: Invalid statusChangeId
  await api.functional.auth.designer.login(connection, {
    body: designerLoginBody,
  });

  await TestValidator.error(
    "update rejected for invalid statusChangeId",
    async () => {
      await api.functional.taskManagement.designer.tasks.statusChanges.update(
        connection,
        {
          taskId: createdTask.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(), // random non-existent id
          body: statusChangeUpdateBody,
        },
      );
    },
  );

  // 13. Failure case: Invalid new_status_id (non-existent)
  await TestValidator.error(
    "update rejected for invalid new_status_id",
    async () => {
      await api.functional.taskManagement.designer.tasks.statusChanges.update(
        connection,
        {
          taskId: createdTask.id,
          statusChangeId: createdStatusChange.id,
          body: {
            new_status_id: typia.random<string & tags.Format<"uuid">>(), // non-existent id
          },
        },
      );
    },
  );
}
