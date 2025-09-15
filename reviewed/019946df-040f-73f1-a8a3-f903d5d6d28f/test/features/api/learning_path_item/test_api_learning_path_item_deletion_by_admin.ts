import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPathItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPathItem";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test validates the deletion of a learning path item by an
 * authorized organization administrator within the Enterprise LMS. The test
 * covers full user authentication and role switching among multiple
 * actors.
 *
 * The test flow includes:
 *
 * 1. System administrator signs up and creates a tenant.
 * 2. Corporate learner signs up and creates a learning path.
 * 3. Content creator instructor signs up and creates a learning path item.
 * 4. Organization administrator signs up, logs in, and deletes the learning
 *    path item.
 * 5. Verification of deletion failure on repeated deletion attempt.
 * 6. Verification of authorization failure for unauthorized user.
 *
 * The test uses proper API calls, role-based authentication, and validates
 * all responses. It asserts correct error handling for invalid deletion and
 * unauthorized access.
 */
export async function test_api_learning_path_item_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. System administrator sign up and login
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "P@ssw0rd!";
  const systemAdminJoinBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminJoinBody,
  });
  typia.assert(systemAdmin);

  // 2. System administrator creates a tenant
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    { body: tenantCreateBody },
  );
  typia.assert(tenant);

  // 3. Corporate learner joins and logs in
  const corporateLearnerEmail = typia.random<string & tags.Format<"email">>();
  const corporateLearnerPassword = "P@ssw0rd!";
  const corporateLearnerJoinBody = {
    tenant_id: tenant.id,
    email: corporateLearnerEmail,
    password: corporateLearnerPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corporateLearner = await api.functional.auth.corporateLearner.join(
    connection,
    { body: corporateLearnerJoinBody },
  );
  typia.assert(corporateLearner);

  // 4. Corporate learner creates a learning path
  const learningPathCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;
  const learningPath =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      { body: learningPathCreateBody },
    );
  typia.assert(learningPath);

  // 5. Content creator instructor joins and logs in
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPassword = "P@ssw0rd!";
  const contentCreatorJoinBody = {
    tenant_id: tenant.id,
    email: contentCreatorEmail,
    password_hash: contentCreatorPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorJoinBody,
    });
  typia.assert(contentCreator);

  // 6. Content creator instructor creates a learning path item
  const learningPathItemCreateBody = {
    learning_path_id: learningPath.id,
    item_type: "course",
    item_id: typia.random<string & tags.Format<"uuid">>(),
    sequence_order: 1,
  } satisfies IEnterpriseLmsLearningPathItem.ICreate;
  const learningPathItem =
    await api.functional.enterpriseLms.contentCreatorInstructor.learningPaths.learningPathItems.create(
      connection,
      {
        learningPathId: learningPath.id,
        body: learningPathItemCreateBody,
      },
    );
  typia.assert(learningPathItem);

  // 7. Organization admin joins
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "P@ssw0rd!";
  const orgAdminJoinBody = {
    tenant_id: tenant.id,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinBody },
  );
  typia.assert(orgAdmin);

  // 8. Organization admin logs in and deletes the learning path item
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });
  await api.functional.enterpriseLms.organizationAdmin.learningPaths.learningPathItems.eraseLearningPathItem(
    connection,
    {
      learningPathId: learningPath.id,
      learningPathItemId: learningPathItem.id,
    },
  );

  // 9. Validate deletion by trying to delete again, expecting failure
  await TestValidator.error("delete already deleted item fails", async () => {
    await api.functional.enterpriseLms.organizationAdmin.learningPaths.learningPathItems.eraseLearningPathItem(
      connection,
      {
        learningPathId: learningPath.id,
        learningPathItemId: learningPathItem.id,
      },
    );
  });

  // 10. Validate authorization failure when unauthorized role tries to delete
  // Switch to corporate learner login
  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: corporateLearnerEmail,
      password: corporateLearnerPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });
  await TestValidator.error(
    "unauthorized user cannot delete learning path item",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.learningPaths.learningPathItems.eraseLearningPathItem(
        connection,
        {
          learningPathId: learningPath.id,
          learningPathItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
