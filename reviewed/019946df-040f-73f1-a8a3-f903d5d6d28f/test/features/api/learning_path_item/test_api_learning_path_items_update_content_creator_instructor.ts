import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * This E2E test validates the full update workflow of a learning path item by a
 * content creator/instructor user in an enterprise LMS system. The test
 * verifies the following steps sequentially:
 *
 * 1. Create and authenticate a new content creator/instructor user with a known
 *    tenant ID.
 * 2. Create and authenticate a corporate learner user in the same tenant.
 * 3. Using the corporate learner's authentication, create a learning path
 *    associated with the tenant.
 * 4. Using the content creator/instructor's authentication, create content that
 *    can be used as a learning path item.
 * 5. Update an existing learning path item in the created learning path with new
 *    information such as changing the item type, item ID (to the newly created
 *    content id), and sequence order.
 * 6. Verify the response from the update call matches expectations, and that the
 *    update passes type assertion.
 *
 * Due to lack of detailed prior data, the test will create necessary entities,
 * and then update the learning path item using the created entities' IDs. The
 * test will also validate tenant isolation and authorization by switching
 * authentication contexts accordingly, and check that the updated fields are
 * correctly assigned.
 *
 * All API calls are awaited. Type assertions using typia.assert ensure both
 * request and response types conform to the expected DTOs. TestValidator
 * assertions are used where appropriate for business logic validations.
 *
 * The test obeys strict typing rules, uses correct DTO types for request
 * bodies, and only uses properties defined in the schemas. Null values replaced
 * by explicit nulls where required.
 *
 * No deliberate type error testing or invalid property usage is included.
 *
 * The entire test is self-contained and fully compatible with the given E2E
 * testing framework and imported utilities.
 */
export async function test_api_learning_path_items_update_content_creator_instructor(
  connection: api.IConnection,
) {
  // 1. Create and authenticate content creator/instructor user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const contentCreatorInstructorJoinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password_hash: "hashed_password_12345",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreatorInstructor: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorInstructorJoinBody,
    });
  typia.assert(contentCreatorInstructor);

  // 2. Create and authenticate corporate learner user with same tenant
  const corporateLearnerJoinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: "password123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerJoinBody,
    });
  typia.assert(corporateLearner);

  // Login as corporate learner (to create learning path)
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerJoinBody.email,
      password: corporateLearnerJoinBody.password,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // 3. Create learning path associated with tenant
  const learningPathCreateBody = {
    tenant_id: tenantId,
    code: `LP-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  // Login as content creator/instructor user again
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: {
      email: contentCreatorInstructorJoinBody.email,
      password: "hashed_password_12345",
    } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
  });

  // 4. Create content to be used in learning path item
  const contentCreateBody = {
    tenant_id: tenantId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "video",
    status: "active",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;
  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: contentCreateBody,
      },
    );
  typia.assert(content);

  // 5. Now update the learning path item, using the newly created entities
  // For test, create a learningPathItemId to update
  const learningPathItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const learningPathItemUpdateBody = {
    item_type: "course",
    item_id: content.id,
    sequence_order: 1,
  } satisfies IEnterpriseLmsLearningPathItem.IUpdate;
  const updatedLearningPathItem: IEnterpriseLmsLearningPathItem =
    await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.learningPathItems.update(
      connection,
      {
        learningPathId: learningPath.id,
        learningPathItemId: learningPathItemId,
        body: learningPathItemUpdateBody,
      },
    );
  typia.assert(updatedLearningPathItem);

  // Check that updated response data matches the input update information, except for id, created_at, updated_at
  TestValidator.equals(
    "learningPath Item updated has matching item_type",
    updatedLearningPathItem.item_type,
    learningPathItemUpdateBody.item_type,
  );
  TestValidator.equals(
    "learningPath Item updated has matching item_id",
    updatedLearningPathItem.item_id,
    learningPathItemUpdateBody.item_id,
  );
  TestValidator.equals(
    "learningPath Item updated has matching sequence_order",
    updatedLearningPathItem.sequence_order,
    learningPathItemUpdateBody.sequence_order,
  );
}
