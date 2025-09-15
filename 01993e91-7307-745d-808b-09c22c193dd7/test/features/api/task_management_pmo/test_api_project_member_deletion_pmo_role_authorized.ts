import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_member_deletion_pmo_role_authorized(
  connection: api.IConnection,
) {
  // Step 1: PMO user registration and authentication
  // Create a PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // Step 2: TPM user registration and authentication
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // Step 3: PMO user login to authenticate again and get fresh token
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLogin);

  // Step 4: TPM user login to authenticate TPM session
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLogin);

  // Step 5: Project creation under PMO user
  const projectCreateBody = {
    owner_id: pmoUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Step 6: Add project member associating the TPM user to the project
  const nowIso = new Date().toISOString();
  const projectMemberCreateBody = {
    project_id: project.id,
    user_id: tpmUser.id,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;
  const projectMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.create(
      connection,
      {
        projectId: project.id,
        body: projectMemberCreateBody,
      },
    );
  typia.assert(projectMember);

  // Step 7: Delete the project member by PMO user with explicit assertion of void return
  const deletionNoContent: void =
    await api.functional.taskManagement.pmo.projects.members.erase(connection, {
      projectId: project.id,
      memberId: projectMember.id,
    });
  TestValidator.equals("deletion returns void", deletionNoContent, undefined);

  // Step 8: Re-authenticate PMO user for fresh valid token
  const pmoLoginFresh: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoLoginFresh);

  // Step 9: Verify the project membership list excludes the deleted member
  // This system does not provide an explicit API to list members, so validate
  // by re-adding the member, expecting successful creation if deletion was effective.
  const recreateMemberBody = {
    project_id: project.id,
    user_id: tpmUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;
  const recreatedMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.create(
      connection,
      {
        projectId: project.id,
        body: recreateMemberBody,
      },
    );
  typia.assert(recreatedMember);
  TestValidator.notEquals(
    "recreated member differs from original",
    projectMember.id,
    recreatedMember.id,
  );
}
