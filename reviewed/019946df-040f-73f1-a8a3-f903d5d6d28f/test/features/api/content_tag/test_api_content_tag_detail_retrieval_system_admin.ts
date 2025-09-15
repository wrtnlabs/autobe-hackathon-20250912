import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates the entire lifecycle of system administrator user
 * creation, authentication, content tag creation, and retrieval of content
 * tag details with proper validation and access control.
 *
 * The test does the following:
 *
 * 1. Creates a system administrator user (join) with mandatory fields.
 * 2. Logs in the system administrator to obtain authentication tokens.
 * 3. Creates a content tag with required code and name, and optional
 *    description.
 * 4. Retrieves the content tag details by ID and validates exact data
 *    consistency.
 * 5. Validates that unauthorized users cannot retrieve content tag details.
 * 6. Validates error handling for retrieval with invalid UUIDs.
 *
 * This scenario verifies proper business logic, authorization, and data
 * consistency in the Enterprise LMS system admin context.
 */
export async function test_api_content_tag_detail_retrieval_system_admin(
  connection: api.IConnection,
) {
  // 1. Create a systemAdmin user (join)
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Authenticate the systemAdmin user (login)
  const loginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a content tag
  const contentTagCreateBody = {
    code: `TAG${RandomGenerator.alphaNumeric(4)}`,
    name: `TagName${RandomGenerator.alphaNumeric(4)}`,
    description: `Description for tag ${RandomGenerator.alphaNumeric(7)}`,
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const createdTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.systemAdmin.contentTags.createContentTag(
      connection,
      {
        body: contentTagCreateBody,
      },
    );
  typia.assert(createdTag);

  // Validate that created tag properties match input
  TestValidator.equals(
    "Content tag code matches creation input",
    createdTag.code,
    contentTagCreateBody.code,
  );
  TestValidator.equals(
    "Content tag name matches creation input",
    createdTag.name,
    contentTagCreateBody.name,
  );
  TestValidator.equals(
    "Content tag description matches creation input",
    createdTag.description ?? null,
    contentTagCreateBody.description ?? null,
  );

  // 4. Retrieve content tag details using id
  const retrievedTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.systemAdmin.contentTags.atContentTag(
      connection,
      {
        id: createdTag.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(retrievedTag);

  // Assert that retrieved tag matches created tag
  TestValidator.equals(
    "Retrieved content tag id matches created",
    retrievedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "Retrieved content tag code matches created",
    retrievedTag.code,
    createdTag.code,
  );
  TestValidator.equals(
    "Retrieved content tag name matches created",
    retrievedTag.name,
    createdTag.name,
  );
  TestValidator.equals(
    "Retrieved content tag description matches created",
    retrievedTag.description ?? null,
    createdTag.description ?? null,
  );

  // 5. Test unauthorized access: create unauthenticated connection and try to retrieve tag
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized user cannot retrieve content tag details",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.atContentTag(
        unauthConnection,
        {
          id: createdTag.id satisfies string & tags.Format<"uuid"> as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // 6. Test retrieval with invalid UUID id
  await TestValidator.error(
    "Retrieval with invalid UUID id should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.atContentTag(
        connection,
        {
          id: "invalid-uuid-id-string" as unknown as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
