import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the entire workflow for a TPM user to retrieve
 * detailed information about a specific member of a project owned by that TPM
 * user. This includes TPM user registration and login, project creation with
 * ownership, project member addition, and detailed member retrieval by ID, with
 * all response data validated for strict schema conformity.
 */
export async function test_api_project_member_detail_retrieve_by_tpm(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpm);

  // 2. TPM creates a new project
  const projectCreateBody = {
    owner_id: typia.assert<string & tags.Format<"uuid">>(tpm.id),
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals(
    "Created project owner_id matches TPM id",
    project.owner_id,
    tpm.id,
  );
  TestValidator.equals(
    "Created project code matches input",
    project.code,
    projectCreateBody.code,
  );

  // 3. Add a member to the created project
  // Simulate a member user id with UUID
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const now = new Date().toISOString();

  const projectMemberCreateBody = {
    project_id: typia.assert<string & tags.Format<"uuid">>(project.id),
    user_id: memberUserId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;

  const member: ITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.create(
      connection,
      {
        projectId: project.id,
        body: projectMemberCreateBody,
      },
    );
  typia.assert(member);
  TestValidator.equals(
    "Created member's project_id matches project id",
    member.project_id,
    project.id,
  );
  TestValidator.equals(
    "Created member's user_id matches input user_id",
    member.user_id,
    memberUserId,
  );

  // 4. Retrieve the member by project ID and member ID
  const retrievedMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.at(connection, {
      projectId: project.id,
      memberId: member.id,
    });
  typia.assert(retrievedMember);

  // 5. Validate that the retrieved member details fully match the created member
  TestValidator.equals(
    "Retrieved member id matches created member's id",
    retrievedMember.id,
    member.id,
  );
  TestValidator.equals(
    "Retrieved member project_id matches",
    retrievedMember.project_id,
    member.project_id,
  );
  TestValidator.equals(
    "Retrieved member user_id matches",
    retrievedMember.user_id,
    member.user_id,
  );
  TestValidator.equals(
    "Retrieved member created_at matches",
    retrievedMember.created_at,
    member.created_at,
  );
  TestValidator.equals(
    "Retrieved member updated_at matches",
    retrievedMember.updated_at,
    member.updated_at,
  );
  TestValidator.equals(
    "Retrieved member deleted_at matches",
    retrievedMember.deleted_at,
    member.deleted_at,
  );
}
