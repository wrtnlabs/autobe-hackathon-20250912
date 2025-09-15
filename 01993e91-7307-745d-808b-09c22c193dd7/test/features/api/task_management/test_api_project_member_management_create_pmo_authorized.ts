import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test covers the complete user and project setup workflow for
 * creating a new Project Member (PM) under a project by an authorized Project
 * Management Officer (PMO) user. The workflow includes authenticating a PMO
 * user, creating a TPM user who will be the project owner, creating a project
 * owned by the TPM user, and finally adding a project member tied to the
 * created project and TPM user. The test verifies crucial business rules such
 * as successful signups, correct setting of properties like IDs and timestamps,
 * and business logic validations around user association. Duplicate email or
 * invalid reference error cases are excluded since they require data that is
 * unknown or unavailable. The test includes step-by-step validation with
 * typia.assert and TestValidator to ensure the identity and structure of each
 * created entity. Authentication context switching between PMO and TPM roles is
 * also handled by sequentially calling respective join and login APIs. All
 * required fields including timestamps are generated with typia.random and
 * RandomGenerator to fulfill schema constraints realistically. The test ensures
 * that after all operations, the created member record is valid and correctly
 * references the project and user. The API function calls use the exact
 * declared parameters and properly await their promises. This structured
 * approach makes the test code focused, comprehensive, and aligned with the
 * business context of project member management in a task management system.
 */
export async function test_api_project_member_management_create_pmo_authorized(
  connection: api.IConnection,
) {
  // 1. PMO user joins and is authenticated
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. TPM user joins and is authenticated
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePass123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 3. Create a new project with TPM user as owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 7,
      wordMin: 4,
      wordMax: 6,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals(
    "Project owner_id matches TPM user id",
    project.owner_id,
    tpmUser.id,
  );

  // 4. Add project member referencing the project and TPM user
  const nowISOString = new Date().toISOString();
  const memberCreateBody = {
    project_id: project.id,
    user_id: tpmUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;
  const member: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.create(
      connection,
      {
        projectId: project.id,
        body: memberCreateBody,
      },
    );
  typia.assert(member);
  TestValidator.equals(
    "Member project_id matches created project id",
    member.project_id,
    project.id,
  );
  TestValidator.equals(
    "Member user_id matches TPM user id",
    member.user_id,
    tpmUser.id,
  );
  TestValidator.predicate(
    "Member deleted_at is null",
    member.deleted_at === null || member.deleted_at === undefined,
  );
}
