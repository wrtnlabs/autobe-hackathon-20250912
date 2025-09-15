import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test function validates the filtered and paginated retrieval
 * of members within a project managed by a TPM user. It ensures correct
 * authorization, data consistency, and filter pagination logic.
 *
 * Steps:
 *
 * 1. Join as a TPM user with random email and name
 * 2. Create a new project owned by this TPM user
 * 3. Register multiple TPM users as project members
 * 4. Fetch members with filtered search term and pagination parameters
 * 5. Validate pagination metadata and returned member data
 */
export async function test_api_project_member_index_filtered_pagination(
  connection: api.IConnection,
) {
  const membersCount = 15;

  // 1. Register and authenticate as TPM user
  const tpmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmUserEmail,
        password: "password1234",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 2. Create a new project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 3. Add multiple members to the project
  const memberUserIds = await ArrayUtil.asyncRepeat(membersCount, async () => {
    // Register and authenticate new TPM users for members
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: ITaskManagementTpm.IAuthorized =
      await api.functional.auth.tpm.join(connection, {
        body: {
          email: memberEmail,
          password: "pass1234",
          name: RandomGenerator.name(),
        } satisfies ITaskManagementTpm.IJoin,
      });
    typia.assert(member);

    // Add member to project
    const createdMember: ITaskManagementProjectMember =
      await api.functional.taskManagement.tpm.projects.members.create(
        connection,
        {
          projectId: project.id,
          body: {
            project_id: project.id,
            user_id: member.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies ITaskManagementProjectMember.ICreate,
        },
      );
    typia.assert(createdMember);
    return member.id;
  });

  TestValidator.equals(
    "all member IDs count",
    memberUserIds.length,
    membersCount,
  );

  // 4. Retrieve the member list with filtering and pagination
  // Filter by a partial search term from one member's user_id prefix
  const searchTerm = memberUserIds[0].substring(0, 8); // partial uuid prefix

  // Request pagination: page = 1, limit = 5
  const page = 1;
  const limit = 5;

  const requestBody = {
    page: page,
    limit: limit,
    search: searchTerm,
  } satisfies ITaskManagementProjectMember.IRequest;

  const response: IPageITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.index(connection, {
      projectId: project.id,
      body: requestBody,
    });
  typia.assert(response);

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page matches requested",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches requested",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination total records >= members count",
    response.pagination.records >= membersCount,
  );

  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages matches calculation",
    response.pagination.pages === expectedPages,
  );

  // Validate the data array length is less or equal to limit
  TestValidator.predicate(
    "data array length <= limit",
    response.data.length <= limit,
  );

  // Validate each member item has valid project_id and user_id
  for (const memberItem of response.data) {
    typia.assert(memberItem);
    TestValidator.equals(
      "member belongs to project",
      memberItem.project_id,
      project.id,
    );
    TestValidator.predicate(
      "member user_id exists in members list",
      memberUserIds.includes(memberItem.user_id),
    );
  }
}
