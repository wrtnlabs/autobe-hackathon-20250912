import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-End test for detailed retrieval of a task comment by an
 * authenticated PMO user.
 *
 * This test simulates the full lifecycle:
 *
 * 1. PMO user registration and login for authentication.
 * 2. TPM user creation who owns the project and will comment.
 * 3. Project creation owned by the TPM user, with required unique code and
 *    name.
 * 4. Board creation inside the project, including necessary project and owner
 *    IDs.
 * 5. Task creation linked to the project and board with all required fields.
 * 6. Comment creation on the task by the TPM user.
 * 7. Retrieval of the comment detailed data by the authenticated PMO user.
 *
 * Each step validates the successful creation or retrieval and asserts data
 * integrity and adherence to formats such as UUID and date-time.
 *
 * Authentication is handled through official join and login APIs, ensuring
 * proper access control and role-specific operations without manual header
 * management.
 */
export async function test_api_comment_detail_retrieval_pmo_authenticated(
  connection: api.IConnection,
) {
  // 1. PMO User registration and authentication
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "password123";
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 2. TPM User creation
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "password123";
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmEmail,
          password_hash: tpmPassword,
          name: RandomGenerator.name(),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUser);

  // Authenticate TPM user to create Project etc.
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. Project creation owned by TPM user
  const projectCode = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 5,
  })
    .replace(/ /g, "_")
    .toLowerCase();
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Board creation within the Project owned by TPM
  const boardCode = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 6,
  })
    .replace(/ /g, "_")
    .toLowerCase();
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: boardCode,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. Task creation linked to the Project and Board
  // Since status_id and priority_id are required, generate random uuids for testing
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();
  const taskTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const taskDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
  });
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: statusId,
        priority_id: priorityId,
        creator_id: tpmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: taskTitle,
        description: taskDesc,
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 6. Comment creation on the Task by the TPM user
  const commentBody = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const comment: ITaskManagementTaskComment =
    await api.functional.taskManagement.tpm.tasks.comments.create(connection, {
      taskId: task.id,
      body: {
        task_id: task.id,
        commenter_id: tpmUser.id,
        comment_body: commentBody,
      } satisfies ITaskManagementTaskComment.ICreate,
    });
  typia.assert(comment);

  // 7. Retrieve the Comment details using PMO user authentication
  // First reauthenticate as PMO user because TPM user is authenticated currently
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  const retrievedComment: ITaskManagementTaskComment =
    await api.functional.taskManagement.pmo.tasks.comments.at(connection, {
      taskId: task.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Validate the retrieved comment matches the created comment
  TestValidator.equals(
    "retrieved comment ID matches created",
    retrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "retrieved comment task ID matches created",
    retrievedComment.task_id,
    comment.task_id,
  );
  TestValidator.equals(
    "retrieved comment commenter ID matches created",
    retrievedComment.commenter_id,
    comment.commenter_id,
  );
  TestValidator.equals(
    "retrieved comment body matches created",
    retrievedComment.comment_body,
    comment.comment_body,
  );
  TestValidator.predicate(
    "retrieved comment timestamps are defined",
    typeof retrievedComment.created_at === "string" &&
      typeof retrievedComment.updated_at === "string",
  );
  TestValidator.equals(
    "retrieved comment deleted_at matches created",
    retrievedComment.deleted_at ?? null,
    comment.deleted_at ?? null,
  );
}
