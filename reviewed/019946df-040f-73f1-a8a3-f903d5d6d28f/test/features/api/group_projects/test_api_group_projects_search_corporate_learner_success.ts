import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGroupProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsGroupProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsGroupProject";

/**
 * Validate corporate learner's ability to search and access their group
 * projects.
 *
 * This test follows the full user flow from corporate learner registration,
 * login, to querying their group project list with pagination and
 * filtering.
 *
 * Steps:
 *
 * 1. Register a corporate learner user for a valid tenant.
 * 2. Login as that user to obtain JWT authentication tokens.
 * 3. Use the token to query group projects list with pagination and filtering.
 *
 * Validations ensure correct type responses and tenant isolation. Only
 * success cases are tested as per the scenario.
 */
export async function test_api_group_projects_search_corporate_learner_success(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@company.com`;
  const password = "Password123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const joinResponse = await api.functional.auth.corporateLearner.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinResponse);

  // 2. Login as the newly created user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loginResponse = await api.functional.auth.corporateLearner.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginResponse);

  // 3. Query group projects list with pagination and filtering
  // Provide some typical pagination values and an optional search
  const filterRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring("project example search term"),
    sort: "start_at",
  } satisfies IEnterpriseLmsGroupProject.IRequest;
  const groupProjectsResponse =
    await api.functional.enterpriseLms.corporateLearner.groupProjects.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(groupProjectsResponse);

  // Validate that pagination data exists and is correct type
  TestValidator.predicate(
    "pagination current page is positive integer",
    groupProjectsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    groupProjectsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is not negative",
    groupProjectsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is not negative",
    groupProjectsResponse.pagination.pages >= 0,
  );

  // Validate data items length does not exceed limit
  TestValidator.predicate(
    "group projects data length does not exceed limit",
    groupProjectsResponse.data.length <= groupProjectsResponse.pagination.limit,
  );
  // Validate each group project entry
  for (const project of groupProjectsResponse.data) {
    typia.assert(project);
    TestValidator.predicate(
      "project id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        project.id,
      ),
    );
    TestValidator.predicate(
      "project title is nonempty string",
      typeof project.title === "string" && project.title.length > 0,
    );
    TestValidator.predicate(
      "owner_id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        project.owner_id,
      ),
    );
    // Validate start_at and end_at are date-time strings
    TestValidator.predicate(
      "start_at is ISO 8601 date-time",
      typeof project.start_at === "string" &&
        !Number.isNaN(Date.parse(project.start_at)),
    );
    TestValidator.predicate(
      "end_at is ISO 8601 date-time",
      typeof project.end_at === "string" &&
        !Number.isNaN(Date.parse(project.end_at)),
    );
  }
}
