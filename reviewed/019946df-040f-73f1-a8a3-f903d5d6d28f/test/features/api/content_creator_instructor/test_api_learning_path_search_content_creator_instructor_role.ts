import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";

/**
 * Validate the search functionality of learning paths for content creator
 * instructor role.
 *
 * This test covers:
 *
 * 1. Register a new content creator instructor user (join) with valid tenant_id
 *    and email.
 * 2. Login using the registered credentials to obtain authorization.
 * 3. Perform filtered searches with pagination using diverse criteria.
 * 4. Validate structure of paginated response and learning path summaries.
 * 5. Test unauthorized access by using unauthenticated connection.
 *
 * Note: For the join operation, password_hash is used with the plain password
 * string. This assumes the API or SDK under test hashes the password internally
 * for authentication. If not, the test setup must modify this accordingly.
 */

export async function test_api_learning_path_search_content_creator_instructor_role(
  connection: api.IConnection,
) {
  // 1. Register content creator instructor
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = `instructor${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "TestPassword123!";

  const createBody = {
    tenant_id,
    email,
    password_hash: password, // assumed plain password treated as hashed in testing
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const joined: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: createBody,
    });
  typia.assert(joined);

  // 2. Login with the registered email and password
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const logged: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // 3. Define search filters
  const baseRequest: IEnterpriseLmsLearningPath.IRequest = {
    page: 1,
    limit: 10,
    search: null,
    status: "active",
    orderBy: "created_at",
    orderDirection: "desc",
  };

  const searchRequests: IEnterpriseLmsLearningPath.IRequest[] = [baseRequest];

  // Search with partial code string search
  searchRequests.push({
    ...baseRequest,
    search: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 8 }),
  });

  // Search with status inactive
  searchRequests.push({
    ...baseRequest,
    status: "inactive",
  });

  // Search ordered by title ascending
  searchRequests.push({
    ...baseRequest,
    orderBy: "title",
    orderDirection: "asc",
  });

  // 4. Execute and validate each search
  for (const req of searchRequests) {
    const output: IPageIEnterpriseLmsLearningPath.ISummary =
      await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.searchLearningPaths(
        connection,
        { body: req },
      );
    typia.assert(output);

    TestValidator.predicate(
      `Pagination current page should match request for page="${req.page}"`,
      output.pagination.current === (req.page ?? 1),
    );

    TestValidator.predicate(
      `Pagination limit should match request for limit="${req.limit}"`,
      output.pagination.limit === (req.limit ?? 100),
    );

    TestValidator.predicate(
      "Data array should be an array",
      Array.isArray(output.data),
    );

    if (output.data.length > 0) {
      for (const learningPath of output.data) {
        typia.assert(learningPath);
        TestValidator.predicate(
          "LearningPath status should be a non-empty string",
          learningPath.status.length > 0,
        );
      }
    }
  }

  // 5. Test unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "searchLearningPaths should fail for unauthenticated user",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.searchLearningPaths(
        unauthConn,
        { body: baseRequest },
      );
    },
  );
}
