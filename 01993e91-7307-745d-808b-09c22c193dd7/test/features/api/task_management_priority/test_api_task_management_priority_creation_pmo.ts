import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";

/**
 * This test validates the creation of a new task management priority by an
 * authorized PMO user. The test first creates and authenticates a PMO user by
 * calling the /auth/pmo/join endpoint with a valid ITaskManagementPmo.IJoin
 * structure containing email, password, and name. Upon successful
 * authorization, the JWT token is used automatically for subsequent calls.
 * Then, a valid priority create request is sent to
 * /taskManagement/pmo/taskManagementPriorities POST endpoint. The test asserts
 * the creation response includes all required fields and correct format. It
 * tests failures on duplicate code and unauthorized creation.
 */
export async function test_api_task_management_priority_creation_pmo(
  connection: api.IConnection,
) {
  // 1. Create and authenticate PMO user
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoJoinBody = {
    email: pmoEmail,
    password: "Test1234!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoAuth);

  // 2. Create a new task management priority
  const priorityCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementPriority.ICreate;

  const createdPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(createdPriority);

  // Validate returned fields
  TestValidator.predicate(
    "priority ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdPriority.id,
    ),
  );
  TestValidator.equals(
    "priority code matches",
    createdPriority.code,
    priorityCreateBody.code,
  );
  TestValidator.equals(
    "priority name matches",
    createdPriority.name,
    priorityCreateBody.name,
  );
  if (
    createdPriority.description === null ||
    createdPriority.description === undefined
  ) {
    TestValidator.predicate("description is nullable", true);
  } else {
    TestValidator.equals(
      "priority description matches",
      createdPriority.description,
      priorityCreateBody.description,
    );
  }

  // Validate timestamps
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^	?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      createdPriority.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      createdPriority.updated_at,
    ),
  );

  // 3. Test failure when creating with duplicate code
  await TestValidator.error("duplicate code creation fails", async () => {
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: priorityCreateBody.code,
          name: RandomGenerator.name(),
          description: null,
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  });

  // 4. Test failure when creating without PMO authentication
  // Create a new connection with empty headers for unauthenticated requests
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized creation fails", async () => {
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      unauthConn,
      {
        body: {
          code: `unauth_${RandomGenerator.alphaNumeric(5)}`,
          name: RandomGenerator.name(),
          description: "Should not be created",
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  });
}
