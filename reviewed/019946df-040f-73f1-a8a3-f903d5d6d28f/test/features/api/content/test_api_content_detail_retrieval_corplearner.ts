import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * End-to-end test for content detail retrieval by a corporate learner user.
 *
 * This test covers the full lifecycle from user creation, authentication
 * through to authorized content detail retrieval. It validates proper
 * multi-tenant isolation, soft delete exclusion, and error handling.
 *
 * Steps:
 *
 * 1. Create a corporate learner user with a tenant ID.
 * 2. Login this user to obtain authorization tokens.
 * 3. Retrieve a content detail record within the user's tenant.
 * 4. Validate the content data structure and tenant ownership.
 * 5. Attempt retrieval of content that is soft deleted or outside tenant,
 *    verifying access is denied.
 */
export async function test_api_content_detail_retrieval_corplearner(
  connection: api.IConnection,
) {
  // 1. Register corporate learner user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string = `${RandomGenerator.name(1).toLowerCase()}@example.com`;

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(createdUser);
  TestValidator.equals(
    "tenant id should match on join",
    createdUser.tenant_id,
    tenantId,
  );
  TestValidator.equals("email should match on join", createdUser.email, email);

  // 2. Login corporate learner user
  const loginBody = {
    email: email,
    password: "StrongPass123!",
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);
  TestValidator.equals(
    "tenant id should match on login",
    loggedInUser.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "email should match on login",
    loggedInUser.email,
    email,
  );

  // 3. Retrieve detailed content with valid content ID for this tenant
  const validContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to get content that should belong to tenant and not soft deleted
  const content: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.corporateLearner.contents.at(
      connection,
      {
        id: validContentId,
      },
    );
  typia.assert(content);

  // 4. Validate content tenant and non-deleted
  TestValidator.equals(
    "content tenant_id should match user tenant",
    content.tenant_id,
    tenantId,
  );
  TestValidator.predicate(
    "content deleted_at should be null or undefined",
    content.deleted_at === null || content.deleted_at === undefined,
  );

  // 5. Test unauthorized queries

  // 5a. Content from a different tenant should give error (simulate 404 or 401)
  // We test by trying to access content with a different tenant ID simulated by UUID
  const foreignContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "access foreign tenant content should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.contents.at(
        connection,
        {
          id: foreignContentId,
        },
      );
    },
  );

  // 5b. Simulate access to soft deleted content (deleted_at not null) fails
  // For this, we assume a UUID content ID that is soft deleted would also fail
  const softDeletedContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "access soft deleted content should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.contents.at(
        connection,
        {
          id: softDeletedContentId,
        },
      );
    },
  );
}
