import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test verifies the complete workflow of a QA user retrieving detailed
 * information of a project.
 *
 * The workflow includes:
 *
 * 1. Registering a QA user.
 * 2. Logging in as the QA user.
 * 3. Registering a TPM user to act as the project owner.
 * 4. Logging in as the TPM user.
 * 5. Creating a project owned by the TPM user.
 * 6. Switching authentication back to the QA user.
 * 7. Retrieving project details as the QA user.
 * 8. Validating that the retrieved project details match the created project.
 *
 * All API interactions are awaited properly and responses are validated
 * using typia.assert. TestValidator is used for asserting logical
 * expectations and test safety.
 */
export async function test_api_project_retrieval_detail_qa_user(
  connection: api.IConnection,
) {
  // 1. Register a new QA user
  const qaUserEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const qaUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const qaUserName = RandomGenerator.name();
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: qaUserEmail,
        password_hash: qaUserPasswordHash,
        name: qaUserName,
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // 2. Login as the QA user
  const qaLogin: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email: qaUserEmail,
        password: qaUserPasswordHash,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(qaLogin);

  // 3. Register a TPM user (project owner)
  const tpmUserEmail = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const tpmUserPassword = RandomGenerator.alphaNumeric(16);
  const tpmUserName = RandomGenerator.name();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmUserEmail,
        password: tpmUserPassword,
        name: tpmUserName,
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 4. For completeness, login as TPM user to get tokens
  // but api.functional.auth.tpm lacks login in inputs, no separate login function provided
  // So we proceed assuming join sets tokens

  // 5. Create a new project as TPM user
  const projectCode = RandomGenerator.alphaNumeric(10);
  const projectName = RandomGenerator.name(3);
  const projectDescription = RandomGenerator.paragraph({ sentences: 5 });

  const newProject: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: projectName,
        description: projectDescription,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(newProject);

  // 6. Login as QA user again to refresh auth context
  // Since tokens might have changed after TPM join
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaUserEmail,
      password: qaUserPasswordHash,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 7. Retrieve the project detail by QA user
  const retrievedProject: ITaskManagementProject =
    await api.functional.taskManagement.qa.projects.at(connection, {
      projectId: newProject.id,
    });
  typia.assert(retrievedProject);

  // 8. Validate the retrieved project matches expected values
  TestValidator.equals("project id", retrievedProject.id, newProject.id);
  TestValidator.equals(
    "project ownerId",
    retrievedProject.owner_id,
    newProject.owner_id,
  );
  TestValidator.equals("project code", retrievedProject.code, newProject.code);
  TestValidator.equals("project name", retrievedProject.name, newProject.name);
  TestValidator.equals(
    "project description",
    retrievedProject.description,
    newProject.description ?? null,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof retrievedProject.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedProject.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof retrievedProject.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        retrievedProject.updated_at,
      ),
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedProject.deleted_at,
    null,
  );
}
