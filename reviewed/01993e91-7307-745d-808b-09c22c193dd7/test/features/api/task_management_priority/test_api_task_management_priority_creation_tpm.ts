import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_priority_creation_tpm(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a TPM user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedTpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(authorizedTpm);

  // 2. Create a valid task management priority
  const createPriorityBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ITaskManagementPriority.ICreate;

  const createdPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: createPriorityBody },
    );
  typia.assert(createdPriority);

  TestValidator.predicate(
    "created priority id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdPriority.id,
    ),
  );
  TestValidator.equals(
    "created priority code matches input",
    createdPriority.code,
    createPriorityBody.code,
  );
  TestValidator.equals(
    "created priority name matches input",
    createdPriority.name,
    createPriorityBody.name,
  );
  TestValidator.equals(
    "created priority description matches input",
    createdPriority.description,
    createPriorityBody.description,
  );

  const createdAt = new Date(createdPriority.created_at);
  const updatedAt = new Date(createdPriority.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !Number.isNaN(updatedAt.getTime()),
  );

  // 3. Attempt to create a priority with duplicate code (should error)
  await TestValidator.error(
    "creation with duplicate code should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementPriorities.create(
        connection,
        {
          body: {
            code: createPriorityBody.code, // duplicate code
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ITaskManagementPriority.ICreate,
        },
      );
    },
  );

  // 4. Attempt to create priority without authentication (simulate unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "creation without authentication should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementPriorities.create(
        unauthenticatedConnection,
        {
          body: {
            code: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ITaskManagementPriority.ICreate,
        },
      );
    },
  );
}
