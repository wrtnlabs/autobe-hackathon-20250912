import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Perform system administrator authentication and update an existing
 * content tag.
 *
 * This comprehensive E2E test validates the flow where a system admin
 * authenticates via /auth/systemAdmin/join and then updates a content tag
 * identified by UUID.
 *
 * Steps:
 *
 * 1. System admin joins and authenticates
 * 2. Prepares update payload with realistic values for code, name, and
 *    description
 * 3. Calls the update API with the content tag ID and update payload
 * 4. Validates the updated content tag matches the update payload
 *
 * All required properties are included, and optional properties respect
 * nullable semantics. typia.assert() ensures full response structure
 * validation.
 *
 * Authorization is managed automatically by the SDK, no manual header
 * manipulation.
 */
export async function test_api_content_tag_update_with_system_admin_authentication(
  connection: api.IConnection,
) {
  // 1. System admin join and authenticate
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdminAuthorized);

  // 2. Prepare content tag update payload
  const updateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEnterpriseLmsContentTag.IUpdate;

  // 3. Generate random UUID for content tag ID
  const contentTagId = typia.random<string & tags.Format<"uuid">>();

  // 4. Perform content tag update API call
  const updatedTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.systemAdmin.contentTags.update(
      connection,
      {
        id: contentTagId,
        body: updateBody,
      },
    );
  typia.assert(updatedTag);

  // 5. Validate updated tag fields match update payload
  TestValidator.equals(
    "Updated content tag code should match update body",
    updatedTag.code,
    updateBody.code,
  );
  TestValidator.equals(
    "Updated content tag name should match update body",
    updatedTag.name,
    updateBody.name,
  );
  if (updateBody.description === null) {
    TestValidator.equals(
      "Updated content tag description should be null",
      updatedTag.description,
      null,
    );
  } else if (updateBody.description === undefined) {
    TestValidator.predicate(
      "Updated content tag description should be string or null",
      updatedTag.description === null ||
        typeof updatedTag.description === "string",
    );
  } else {
    TestValidator.equals(
      "Updated content tag description should match update body",
      updatedTag.description,
      updateBody.description,
    );
  }
}
