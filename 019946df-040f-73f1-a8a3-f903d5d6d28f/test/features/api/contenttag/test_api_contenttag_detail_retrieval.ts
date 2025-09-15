import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the retrieving of content tag details.
 *
 * This test validates the entire flow of an organization administrator
 * authenticating, creating a content tag within their tenant, retrieving
 * that content tag by ID, and properly handling errors like requesting a
 * non-existent content tag or missing authentication.
 *
 * Steps:
 *
 * 1. Perform the organization admin join operation once to create an admin
 *    user.
 * 2. Perform login with the admin user credentials to receive a valid
 *    authorization token.
 * 3. Create a content tag with random, unique code and name within the tenant.
 * 4. Retrieve the content tag detail by ID and verify all fields match the
 *    creation data.
 * 5. Attempt retrieval with a non-existent tag ID to verify appropriate error
 *    handling.
 * 6. Attempt retrieval without authentication to verify access control
 *    enforcement.
 *
 * This confirms secure, tenant-isolated content tag detail retrieval
 * functionality.
 */
export async function test_api_contenttag_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Perform join once to create a known organization admin user
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphaNumeric(8)}@enterprise.test`,
    password: "StrongP@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joinedAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joinedAdmin);

  // Step 2: Login with the created admin user credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInAdmin);

  // Step 3: Create a content tag within the tenant of the logged-in admin
  const contentTagCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: "Description for automated test content tag",
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const createdTag =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.createContentTag(
      connection,
      {
        body: contentTagCreateBody,
      },
    );
  typia.assert(createdTag);

  // Step 4: Retrieve content tag details by ID
  const retrievedTag =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.atContentTag(
      connection,
      {
        id: createdTag.id,
      },
    );
  typia.assert(retrievedTag);

  // Validate content tag matches creation data
  TestValidator.equals(
    "content tag ID matches",
    retrievedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "content tag code matches",
    retrievedTag.code,
    contentTagCreateBody.code,
  );
  TestValidator.equals(
    "content tag name matches",
    retrievedTag.name,
    contentTagCreateBody.name,
  );
  TestValidator.equals(
    "content tag description matches",
    retrievedTag.description ?? null,
    contentTagCreateBody.description ?? null,
  );

  // Step 5: Attempt retrieval with non-existent ID
  let invalidId = typia.random<string & tags.Format<"uuid">>();
  if (invalidId === createdTag.id) {
    // Rare collision, generate another
    invalidId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.error(
    "retrieve non-existent content tag should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.atContentTag(
        connection,
        {
          id: invalidId,
        },
      );
    },
  );

  // Step 6: Attempt retrieval unauthorized (disable headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized retrieval should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentTags.atContentTag(
      unauthenticatedConnection,
      {
        id: createdTag.id,
      },
    );
  });
}
