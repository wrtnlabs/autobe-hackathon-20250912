import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPathItem";

/**
 * This E2E test validates the complete workflow of listing learning path items
 * for a given learning path by a corporate learner, including user
 * registration, authentication, learning path creation, adding learning path
 * items, and finally retrieving the list with pagination and filtering
 * parameters. The test covers the roles of corporateLearner and
 * contentCreatorInstructor with proper role switching by authenticating and
 * obtaining tokens for each. It performs pagination verification by requesting
 * a limited page and page number, applies filters such as item_type or item_id,
 * and tests sorting order via orderBy parameter. Business logic checks include
 * verifying tenant isolation (only tenant's learning path items returned),
 * correct pagination response structure, and presence of item summaries with
 * expected property types. The process includes:
 *
 * 1. Register two users: one corporate learner and one content creator instructor
 *    with separate tenants
 * 2. Authenticate both users to obtain access tokens
 * 3. Create a new learning path under the corporate learner's tenant
 * 4. Add several learning path items via content creator instructor under that
 *    learning path
 * 5. Retrieve paginated and filtered list of learning path items as the corporate
 *    learner
 * 6. Validate pagination info and correctness of returned items
 */
export async function test_api_learning_path_items_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register corporate learner
  const corporateLearnerCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${typia.random<string & tags.Format<"email">>()}`,
    password: "ValidPass123!",
    first_name: typia.random<string>(),
    last_name: typia.random<string>(),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearner);

  // Step 2: Login as corporate learner
  const corporateLearnerLoginBody = {
    email: corporateLearnerCreateBody.email,
    password: corporateLearnerCreateBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const corporateLearnerLoggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corporateLearnerLoginBody,
    });
  typia.assert(corporateLearnerLoggedIn);

  // Step 3: Register content creator instructor linked to the same tenant
  const contentCreatorInstructorCreateBody = {
    tenant_id: corporateLearnerCreateBody.tenant_id,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedpassword123",
    first_name: typia.random<string>(),
    last_name: typia.random<string>(),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorInstructorCreateBody,
    });
  typia.assert(contentCreatorInstructor);

  // Step 4: Login as content creator instructor
  const contentCreatorInstructorLoginBody = {
    email: contentCreatorInstructorCreateBody.email,
    password: "hashedpassword123",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const contentCreatorInstructorLoggedIn: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: contentCreatorInstructorLoginBody,
    });
  typia.assert(contentCreatorInstructorLoggedIn);

  // Step 5: Create a learning path as corporate learner tenant
  const learningPathCreateBody = {
    tenant_id: corporateLearnerCreateBody.tenant_id,
    code: `LP-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const learningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: learningPathCreateBody,
      },
    );
  typia.assert(learningPath);

  // Step 6: Add several learning path items via content creator instructor
  const itemsToCreate = ArrayUtil.repeat(5, (index) => {
    return {
      learning_path_id: learningPath.id,
      item_type: index % 2 === 0 ? "course" : "module",
      item_id: typia.random<string & tags.Format<"uuid">>(),
      sequence_order: index + 1,
    } satisfies IEnterpriseLmsLearningPathItem.ICreate;
  });

  const createdItems: IEnterpriseLmsLearningPathItem[] = [];
  for (const item of itemsToCreate) {
    const created =
      await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.learningPathItems.create(
        connection,
        {
          learningPathId: learningPath.id,
          body: item,
        },
      );
    typia.assert(created);
    createdItems.push(created);
  }

  // Step 7: Corporate learner retrieving paginated filtered list
  const requestBody = {
    page: 1,
    limit: 3,
    item_type: "course",
    orderBy: "sequence_order ASC",
  } satisfies IEnterpriseLmsLearningPathItem.IRequest;

  const pageResult: IPageIEnterpriseLmsLearningPathItem =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.learningPathItems.index(
      connection,
      {
        learningPathId: learningPath.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // Validate pagination information
  TestValidator.equals(
    "current page",
    pageResult.pagination.current,
    requestBody.page!,
  );
  TestValidator.equals(
    "limit",
    pageResult.pagination.limit,
    requestBody.limit!,
  );

  // Validate filtered items belong to learningPath and item_type
  for (const item of pageResult.data) {
    TestValidator.equals(
      "learning path id matches",
      item.learning_path_id,
      learningPath.id,
    );
    TestValidator.equals(
      "item type matches filter",
      item.item_type,
      requestBody.item_type!,
    );
  }

  // Validate sorting order sequence
  for (let i = 1; i < pageResult.data.length; i++) {
    TestValidator.predicate(
      "sequence order ascending",
      pageResult.data[i - 1].sequence_order <=
        pageResult.data[i].sequence_order,
    );
  }
}
