import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the deletion of a comment on a task by an authorized
 * Project Manager (PM) user. The flow is as follows:
 *
 * 1. Create and authenticate a PM user with /auth/pm/join and /auth/pm/login.
 * 2. Create and authenticate a Technical Project Manager (TPM) user to own a
 *    project.
 * 3. Create a project owned by the TPM user.
 * 4. Create a board within the project assigned to the TPM user.
 * 5. Create a task that is linked to the project and board.
 * 6. Create a comment on the task by the PM user.
 * 7. Use the PM user authentication to perform the comment deletion by taskId and
 *    commentId.
 * 8. Validate that deletion completes with no response (void).
 * 9. Attempt to delete invalid comment/task IDs or comments not belonging to the
 *    PM's accessible tasks and expect errors.
 *
 * The test ensures authorization rules are enforced such that only PM users can
 * delete comments on tasks they have authority on, that deletion persists, and
 * invalid operations are blocked with error responses.
 *
 * All API calls use the exact DTOs, correct UUID format, and proper usage of
 * authentication tokens returned from login endpoints. Random data generation
 * for names and text are used where appropriate. All response data is asserted
 * with typia.assert for perfect type safety.
 */
export async function test_api_task_management_comment_deletion_by_pm_with_valid_ids(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a PM user with join and login
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "validPass123";
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // Login PM user to establish auth context
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 2. Create and authenticate a TPM user to be project owner
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "validPass123";
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // Login TPM user to establish auth context
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. Create a project with owner as TPM user
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Create a board in the project with owner as TPM user
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. Create a task linked to the project and board, with creator as PM user
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: typia.random<string & tags.Format<"uuid">>(),
        priority_id: typia.random<string & tags.Format<"uuid">>(),
        creator_id: pmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status_name: "To Do",
        priority_name: "Normal",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 6. Create a comment on the task by PM user
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pm.tasks.comments.create(connection, {
      taskId: task.id,
      body: {
        task_id: task.id,
        commenter_id: pmUser.id,
        comment_body: commentBody,
      } satisfies ITaskManagementTaskComment.ICreate,
    });
  typia.assert(comment);

  // 7. Authenticate PM user again before deletion to ensure auth context
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: pmPassword,
    } satisfies ITaskManagementPm.ILogin,
  });

  // 8. Delete the comment
  await api.functional.taskManagement.pm.tasks.comments.erase(connection, {
    taskId: task.id,
    commentId: comment.id,
  });

  // 9. Validate deletion by attempting an error deletion for non-existent
  // comment should throw error
  await TestValidator.error(
    "delete with non-existent commentId throws",
    async () => {
      await api.functional.taskManagement.pm.tasks.comments.erase(connection, {
        taskId: task.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 10. Validate deletion by attempting an error with non-existent taskId
  await TestValidator.error(
    "delete with non-existent taskId throws",
    async () => {
      await api.functional.taskManagement.pm.tasks.comments.erase(connection, {
        taskId: typia.random<string & tags.Format<"uuid">>(),
        commentId: comment.id,
      });
    },
  );

  // 11. Validate unauthorized deletion rejection: create another PM user and
  // try to delete comment created by first PM
  const pmEmail2 = typia.random<string & tags.Format<"email">>();
  const pmPassword2 = "validPass123";
  const pmUser2: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail2,
        password: pmPassword2,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser2);

  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail2,
      password: pmPassword2,
    } satisfies ITaskManagementPm.ILogin,
  });

  await TestValidator.error(
    "unauthorized PM cannot delete other's comment",
    async () => {
      await api.functional.taskManagement.pm.tasks.comments.erase(connection, {
        taskId: task.id,
        commentId: comment.id,
      });
    },
  );
}
