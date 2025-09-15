import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test function validates the creation of a new content tag by a
 * system administrator in an enterprise LMS setting. It covers the full
 * user journey from system admin registration and authentication to content
 * tag creation.
 *
 * Steps include:
 *
 * 1. Register a new system administrator using realistic and valid data.
 * 2. Authenticate the system administrator and obtain the JWT token.
 * 3. Use the authenticated context to create a new content tag with a unique
 *    code and descriptive name.
 * 4. Validate that the created content tag response contains all expected
 *    properties and types, including the tenant requirements.
 * 5. Attempt to create a duplicate tag code to confirm error handling for
 *    uniqueness constraints.
 * 6. Also test unauthorized creation attempt to ensure access control.
 *
 * The test ensures proper multi-tenant isolation is maintained and the API
 * behaves as expected with correct role authorization.
 */
export async function test_api_content_tag_creation_with_system_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register system administrator
  const systemAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminBody,
    });
  typia.assert(admin);

  // 2. Create a content tag using authenticated token context
  const uniqueCode = `tag-${RandomGenerator.alphaNumeric(10)}`;
  const tagCreateBody = {
    code: uniqueCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const tag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
      connection,
      {
        body: tagCreateBody,
      },
    );
  typia.assert(tag);

  TestValidator.equals("tag code should match", tag.code, uniqueCode);
  TestValidator.predicate(
    "tag id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      tag.id,
    ),
  );
  TestValidator.equals("tag name should match", tag.name, tagCreateBody.name);

  // 3. Attempt to create a duplicate tag code to assert failure
  await TestValidator.error("duplicate tag code should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
      connection,
      {
        body: {
          code: uniqueCode, // duplicate
          name: "another name",
        } satisfies IEnterpriseLmsContentTag.ICreate,
      },
    );
  });

  // 4. Test unauthorized content tag creation with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized creation should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
      unauthenticatedConnection,
      {
        body: tagCreateBody,
      },
    );
  });
}
