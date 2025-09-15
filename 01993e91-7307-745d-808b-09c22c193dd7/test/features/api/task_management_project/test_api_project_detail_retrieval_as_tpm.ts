import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_detail_retrieval_as_tpm(
  connection: api.IConnection,
) {
  // 1. Register TPM user (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(tpmUser);

  // 2. Create a project with the TPM user as owner
  const projectCode = RandomGenerator.alphaNumeric(8);
  const projectName = RandomGenerator.name(2);
  const projectDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const createProjectBody = {
    owner_id: tpmUser.id,
    code: projectCode,
    name: projectName,
    description: projectDescription,
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: createProjectBody,
    });
  typia.assert(project);

  // 3. Retrieve project detail by projectId
  const projectDetail: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.at(connection, {
      projectId: project.id,
    });
  typia.assert(projectDetail);

  // 4. Validate fields of project detail
  TestValidator.equals(
    "owner_id matches TPM user",
    projectDetail.owner_id,
    tpmUser.id,
  );
  TestValidator.equals("project code matches", projectDetail.code, projectCode);
  TestValidator.equals("project name matches", projectDetail.name, projectName);
  TestValidator.equals(
    "project description matches",
    projectDetail.description,
    projectDescription,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    typeof projectDetail.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        projectDetail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    typeof projectDetail.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        projectDetail.updated_at,
      ),
  );

  // 5. Test error handling for non-existent projectId
  await TestValidator.error("non-existent projectId throws error", async () => {
    await api.functional.taskManagement.tpm.projects.at(connection, {
      projectId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
