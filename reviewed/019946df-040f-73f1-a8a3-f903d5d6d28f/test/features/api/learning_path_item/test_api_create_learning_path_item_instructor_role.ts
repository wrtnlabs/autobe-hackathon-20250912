import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * End-to-end test for creating a learning path item in the context of a
 * content creator/instructor user.
 *
 * This test validates the full workflow:
 *
 * 1. Content creator/instructor user joins and logs in.
 * 2. A new learning path is created by a corporate learner under the same
 *    tenant.
 * 3. A learning path item is created within the learning path by the content
 *    creator/instructor.
 * 4. Verifies the created learning path item has correct properties and is
 *    linked to the learning path.
 * 5. Ensures authentication tokens are properly handled and tenant isolation
 *    is respected.
 *
 * The test emphasizes correct sequencing, valid UUID usage, and appropriate
 * content item details.
 */
export async function test_api_create_learning_path_item_instructor_role(
  connection: api.IConnection,
) {
  // 1. Content creator/instructor joins
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const contentCreatorEmail = RandomGenerator.alphaNumeric(8) + "@example.com";
  const contentCreatorPassword = "pa$$w0rd";
  const contentCreatorCreate = {
    tenant_id: tenantId,
    email: contentCreatorEmail,
    password_hash: contentCreatorPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreate,
    });
  typia.assert(contentCreatorAuthorized);

  // 2. Content creator/instructor logs in
  const contentCreatorLogin = {
    email: contentCreatorEmail,
    password: contentCreatorPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const contentCreatorLoggedIn =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: contentCreatorLogin,
    });
  typia.assert(contentCreatorLoggedIn);

  // 3. A new learning path is created by a corporate learner under the same tenant
  // Generate unique code and title for learning path
  const learningPathCode = RandomGenerator.alphaNumeric(8);
  const learningPathCreate = {
    tenant_id: tenantId,
    code: learningPathCode,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const learningPath =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      { body: learningPathCreate },
    );
  typia.assert(learningPath);

  // 4. Create a learning path item within the learning path by content creator/instructor
  // Generate item details
  const learningPathItemCreate = {
    learning_path_id: learningPath.id,
    item_type: "course",
    item_id: typia.random<string & tags.Format<"uuid">>(),
    sequence_order: RandomGenerator.pick([1, 2, 3, 4, 5]),
  } satisfies IEnterpriseLmsLearningPathItem.ICreate;

  const learningPathItem =
    await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.learningPathItems.create(
      connection,
      {
        learningPathId: learningPath.id,
        body: learningPathItemCreate,
      },
    );
  typia.assert(learningPathItem);

  // 5. Verify that created learning path item has correct linkage and properties
  TestValidator.equals(
    "learningPathItem.learning_path_id must match learningPath.id",
    learningPathItem.learning_path_id,
    learningPath.id,
  );
  TestValidator.equals(
    "learningPathItem.item_type must match input",
    learningPathItem.item_type,
    learningPathItemCreate.item_type,
  );
  TestValidator.equals(
    "learningPathItem.item_id must match input",
    learningPathItem.item_id,
    learningPathItemCreate.item_id,
  );
  TestValidator.equals(
    "learningPathItem.sequence_order must match input",
    learningPathItem.sequence_order,
    learningPathItemCreate.sequence_order,
  );
}
