import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

/**
 * This e2e test verifies the listing of project members from a Project
 * Management Officer (PMO)'s perspective with valid filters and pagination. It
 * covers the entire flow: registering and authenticating as a PMO user,
 * creating a project owned by this PMO, adding multiple members to the project,
 * and then querying the members list with pagination and filtering criteria to
 * confirm correctness of retrieved data and pagination metadata. It validates
 * authorization by ensuring only PMO users can access this member listing
 * endpoint, and also tests edge cases like invalid project IDs and attempts by
 * unauthorized users. The test uses the exact DTO types for all request bodies
 * and performs typia assertions for all responses to ensure full type safety
 * and validation.
 */
export async function test_api_project_member_index_pmo_valid_filters_pagination(
  connection: api.IConnection,
) {
  // Step 1: PMO user registration and authentication
  const pmoJoinBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: "Password123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoAuthorized);

  // Step 2: Create a project belonging to PMO user
  const projectCreateBody = {
    owner_id: pmoAuthorized.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: "Sample Project " + RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Step 3: Add multiple members to the project
  const memberCount = 20;

  const members: ITaskManagementProjectMember[] = [];
  for (let i = 0; i < memberCount; ++i) {
    const memberBody = {
      project_id: project.id,
      user_id: typia.random<string & tags.Format<"uuid">>(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies ITaskManagementProjectMember.ICreate;

    const member =
      await api.functional.taskManagement.pmo.projects.members.create(
        connection,
        {
          projectId: project.id,
          body: memberBody,
        },
      );
    typia.assert(member);
    members.push(member);
  }

  // Step 4: Perform filtered and paginated listing of project members
  const filterSearchTerm = members[0].user_id.substring(0, 8); // Partial user_id for search test
  const indexRequestBody = {
    page: 1,
    limit: 5,
    search: filterSearchTerm,
  } satisfies ITaskManagementProjectMember.IRequest;

  const membersPage: IPageITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.index(connection, {
      projectId: project.id,
      body: indexRequestBody,
    });
  typia.assert(membersPage);

  // Step 5: Validate pagination metadata and response data
  TestValidator.predicate(
    "pagination current page should be 1",
    membersPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    membersPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records should be <= total added members",
    membersPage.pagination.records <= memberCount,
  );
  TestValidator.predicate(
    "pagination pages should be computed correctly",
    membersPage.pagination.pages ===
      Math.ceil(membersPage.pagination.records / membersPage.pagination.limit),
  );

  // Ensure all returned members belong to the project and match the search
  TestValidator.predicate(
    "all members belong to the project",
    membersPage.data.every((member) => member.project_id === project.id),
  );

  TestValidator.predicate(
    "all member user_id contains search term",
    membersPage.data.every((member) =>
      member.user_id.includes(filterSearchTerm),
    ),
  );

  // Step 6: Validate authorization - try to fetch members with invalid projectId
  await TestValidator.error(
    "fetching members with invalid project id fails",
    async () => {
      await api.functional.taskManagement.pmo.projects.members.index(
        connection,
        {
          projectId: "00000000-0000-0000-0000-000000000000",
          body: indexRequestBody,
        },
      );
    },
  );

  // Step 7: Test unauthorized access - simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to project members list fails",
    async () => {
      await api.functional.taskManagement.pmo.projects.members.index(
        unauthConn,
        {
          projectId: project.id,
          body: indexRequestBody,
        },
      );
    },
  );
}
