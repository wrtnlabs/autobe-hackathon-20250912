import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";

/**
 * This end-to-end test validates the lifecycle of content management by a
 * content creator/instructor on an enterprise LMS platform.
 *
 * The test sequentially executes the following steps:
 *
 * 1. Registers a new content creator/instructor user with a valid tenant ID and
 *    personal details.
 * 2. Logs in as the created user, obtaining authentication tokens.
 * 3. Creates a new content record linked to the tenant.
 * 4. Updates the content record with modified title, description, status, and
 *    lifecycle business status.
 * 5. Validates that the update succeeded and that the returned content reflects
 *    the changes.
 *
 * The test ensures proper handling of authentication, authorization, tenant
 * isolation, and validates business rule compliance by checking the tenant ID
 * invariance and content metadata fields.
 *
 * All API calls are awaited and response types are asserted with typia.assert
 * for perfect runtime validation.
 */
export async function test_api_content_creation_update_e2e(
  connection: api.IConnection,
) {
  // 1. Register a new content creator/instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorizedUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Login as the created user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loginUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Create a new content item
  const createBody = {
    tenant_id: tenantId,
    title: `Course ${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    content_type: "video",
    status: "draft",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdContent);

  // 4. Update the content item
  const updateBody = {
    title: `Updated ${createBody.title}`,
    description: RandomGenerator.content({ paragraphs: 3 }),
    status: "approved",
    business_status: "active",
  } satisfies IEnterpriseLmsContents.IUpdate;

  const updatedContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.update(
      connection,
      {
        id: createdContent.id,
        body: updateBody,
      },
    );
  typia.assert(updatedContent);

  TestValidator.equals("updated title", updatedContent.title, updateBody.title);
  TestValidator.equals(
    "updated description",
    updatedContent.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated status",
    updatedContent.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated business_status",
    updatedContent.business_status,
    updateBody.business_status,
  );
  TestValidator.equals(
    "tenant_id unchanged",
    updatedContent.tenant_id,
    tenantId,
  );
}
