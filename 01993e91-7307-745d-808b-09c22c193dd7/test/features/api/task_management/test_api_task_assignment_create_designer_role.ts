import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_assignment_create_designer_role(
  connection: api.IConnection,
) {
  // 1. Designer user registration and authentication
  const designerEmail: string = typia.random<string & tags.Format<"email">>();
  const designerPlainPassword: string = RandomGenerator.alphaNumeric(16);
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: designerEmail,
        password_hash: designerPlainPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // 2. TPM user registration and authentication
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmPlainPassword: string = RandomGenerator.alphaNumeric(16);
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPlainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpm);

  // 3. Authenticate as TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPlainPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 4. Create task status
  const taskStatusBody = {
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 5. Create priority
  const priorityBody = {
    code: RandomGenerator.alphaNumeric(3),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: priorityBody },
    );
  typia.assert(priority);

  // 6. Create project under TPM
  const projectBody = {
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 7. Create board within project under TPM
  const boardBody = {
    project_id: project.id,
    owner_id: tpm.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 8. Create task with links to status, priority, TPM as creator, project and board
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: priority.id,
    creator_id: tpm.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 9. Switch authentication to designer user
  await api.functional.auth.designer.login(connection, {
    body: {
      email: designerEmail,
      password: designerPlainPassword,
    } satisfies ITaskManagementDesigner.ILogin,
  });

  // 10. Create assignment for the designer user on the task
  const assignments: ITaskManagementTaskAssignmentArray =
    await api.functional.taskManagement.designer.tasks.assignments.indexTaskAssignments(
      connection,
      { taskId: task.id },
    );
  typia.assert(assignments);

  // 11. Validate the assignment references taskId and assigneeId
  TestValidator.equals(
    "assignment data contains the correct taskId",
    assignments.data[0]?.task_id,
    task.id,
  );
  TestValidator.predicate(
    "assignee ID matches designer user",
    assignments.data.some((a) => a.assignee_id === designer.id),
  );
  TestValidator.predicate(
    "assignment timestamp assigned_at exists",
    assignments.data.every(
      (a) => a.assigned_at !== null && a.assigned_at !== undefined,
    ),
  );

  // 12. Negative tests
  // 12.1. Invalid taskId
  await TestValidator.error("invalid taskId should throw", async () => {
    await api.functional.taskManagement.designer.tasks.assignments.indexTaskAssignments(
      connection,
      { taskId: "00000000-0000-0000-0000-000000000000" },
    );
  });

  // 12.2. Unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "access without authentication should fail",
    async () => {
      await api.functional.taskManagement.designer.tasks.assignments.indexTaskAssignments(
        unauthenticatedConnection,
        { taskId: task.id },
      );
    },
  );
}
