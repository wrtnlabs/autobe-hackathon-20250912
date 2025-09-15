import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_member_management_update_tpm_authorized(
  connection: api.IConnection,
) {
  // 1. TPM user joins (registers)
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "password123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. PMO user joins (registers)
  const pmoJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.org",
    password: "password123",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 3. PMO user logs in
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLogin);

  // 4. PMO user creates a project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);
  TestValidator.equals(
    "project created owner_id matches tpm user id",
    createdProject.owner_id,
    tpmUser.id,
  );

  // 5. PMO user adds a project member
  const nowISOString = new Date().toISOString();
  const memberCreateBody = {
    project_id: createdProject.id,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;
  const createdMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.create(
      connection,
      {
        projectId: createdProject.id,
        body: memberCreateBody,
      },
    );
  typia.assert(createdMember);
  TestValidator.equals(
    "member created project_id matches project",
    createdMember.project_id,
    createdProject.id,
  );

  // 6. TPM user logs in
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLogin);

  // 7. TPM user updates the project member
  const memberUpdateBody = {
    project_id: createdProject.id,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.IUpdate;
  const updatedMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.update(
      connection,
      {
        projectId: createdProject.id,
        memberId: createdMember.id,
        body: memberUpdateBody,
      },
    );
  typia.assert(updatedMember);

  // Validate updated member data
  TestValidator.equals(
    "updated member id remains the same",
    updatedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "updated member project_id matches",
    updatedMember.project_id,
    memberUpdateBody.project_id,
  );
  TestValidator.equals(
    "updated member user_id matches",
    updatedMember.user_id,
    memberUpdateBody.user_id,
  );
  TestValidator.equals(
    "updated member deleted_at is null",
    updatedMember.deleted_at,
    null,
  );

  // 8. Test unauthorized update attempts
  const unauthorizedMemberUpdateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ITaskManagementProjectMember.IUpdate;
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.taskManagement.tpm.projects.members.update(
      connection,
      {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        memberId: createdMember.id,
        body: unauthorizedMemberUpdateBody,
      },
    );
  });

  await TestValidator.error(
    "update with invalid memberId should fail",
    async () => {
      await api.functional.taskManagement.tpm.projects.members.update(
        connection,
        {
          projectId: createdProject.id,
          memberId: typia.random<string & tags.Format<"uuid">>(),
          body: unauthorizedMemberUpdateBody,
        },
      );
    },
  );
}
