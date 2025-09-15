import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

export async function test_api_project_member_index_pm_valid_filters_pagination(
  connection: api.IConnection,
) {
  // 1. Join as PM to authenticate
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: `pmuser${Date.now()}@example.com`,
        password: "StrongPwd123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Create a new project owned by PM
  const projectCode = `proj_${RandomGenerator.alphaNumeric(8)}`;
  const projectName = `Project for ${pmUser.name}`;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmUser.id,
        code: projectCode,
        name: projectName,
        description: `A test project created by ${pmUser.name}`,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 3. Add multiple project members
  const memberCount = 15;
  const memberArray = await ArrayUtil.asyncRepeat(memberCount, async () => {
    // For each member, create unique IDs and timestamps
    const userId = typia.random<string & tags.Format<"uuid">>();
    const nowString = new Date().toISOString();

    const memberBody: ITaskManagementProjectMember.ICreate = {
      project_id: project.id,
      user_id: userId,
      created_at: nowString,
      updated_at: nowString,
      deleted_at: null,
    };

    const member: ITaskManagementProjectMember =
      await api.functional.taskManagement.pm.projects.members.create(
        connection,
        {
          projectId: project.id,
          body: memberBody,
        },
      );
    typia.assert(member);
    return member;
  });

  // 4. Test listing with pagination and filtering

  // Helper: paginate and filter
  type QueryType = ITaskManagementProjectMember.IRequest;

  // 4.1. Request first page with limit 5, no filter
  let query: QueryType = {
    page: 1,
    limit: 5,
    search: null,
  };
  let response = await api.functional.taskManagement.pm.projects.members.index(
    connection,
    {
      projectId: project.id,
      body: query,
    },
  );
  typia.assert(response);

  TestValidator.predicate(
    "pagination data is array",
    Array.isArray(response.data),
  );
  TestValidator.equals(
    "pagination limit correct",
    response.pagination.limit,
    query.limit ?? 0,
  );
  TestValidator.equals(
    "pagination current page correct",
    response.pagination.current,
    query.page ?? 0,
  );
  TestValidator.predicate(
    "records count equal or greater than data length",
    response.pagination.records >= response.data.length,
  );

  // 4.2. Test search filter - search by user_id of a member
  const sampleMember = RandomGenerator.pick(memberArray);
  TestValidator.predicate(
    "sample member userId non-empty",
    typeof sampleMember.user_id === "string" && sampleMember.user_id.length > 0,
  );

  query = {
    page: 1,
    limit: 10,
    search: sampleMember.user_id.substring(0, 8),
  };

  response = await api.functional.taskManagement.pm.projects.members.index(
    connection,
    {
      projectId: project.id,
      body: query,
    },
  );
  typia.assert(response);

  TestValidator.predicate(
    "filtered data includes sample member user_id",
    response.data.some((m) => m.user_id === sampleMember.user_id),
  );

  // 4.3. Test pagination for last page - page beyond total pages returns empty or fewer
  const totalPages = response.pagination.pages;
  if (totalPages > 0) {
    query = {
      page: totalPages + 1,
      limit: 5,
      search: null,
    };
    const lastPageRes =
      await api.functional.taskManagement.pm.projects.members.index(
        connection,
        {
          projectId: project.id,
          body: query,
        },
      );
    typia.assert(lastPageRes);
    TestValidator.predicate(
      "last page data empty",
      lastPageRes.data.length === 0,
    );
  }

  // 5. Error cases

  // 5.1. Invalid projectId (random UUID not used in creation)
  await TestValidator.error("invalid projectId causes error", async () => {
    await api.functional.taskManagement.pm.projects.members.index(connection, {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 5,
        search: null,
      } satisfies ITaskManagementProjectMember.IRequest,
    });
  });

  // 5.2. Unauthorized access - create a second PM user and try to access first project
  const anotherPm: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: `anotherpm${Date.now()}@example.com`,
        password: "StrongPwd123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(anotherPm);

  // Re-authenticate as anotherPm user to update auth token internally
  await api.functional.auth.pm.join(connection, {
    body: {
      email: anotherPm.email,
      password: "StrongPwd123!",
      name: anotherPm.name,
    } satisfies ITaskManagementPm.ICreate,
  });

  await TestValidator.error(
    "unauthorized access by different PM user",
    async () => {
      await api.functional.taskManagement.pm.projects.members.index(
        connection,
        {
          projectId: project.id,
          body: {
            page: 1,
            limit: 5,
            search: null,
          } satisfies ITaskManagementProjectMember.IRequest,
        },
      );
    },
  );
}
