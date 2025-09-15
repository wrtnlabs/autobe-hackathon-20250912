import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";

export async function test_api_content_tag_detail_retrieval_valid_id(
  connection: api.IConnection,
) {
  // 1. Register a new contentCreatorInstructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "Password123!";

  const joinedUser = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: password,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    },
  );
  typia.assert(joinedUser);

  // 2. Authenticate with login
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    },
  );
  typia.assert(loggedInUser);

  // 3. Create a content tag under this tenant
  const tagCode = RandomGenerator.alphaNumeric(10);
  const tagName = RandomGenerator.name(2);
  const tagDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdTag =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.createContentTag(
      connection,
      {
        body: {
          code: tagCode,
          name: tagName,
          description: tagDescription,
        } satisfies IEnterpriseLmsContentTag.ICreate,
      },
    );
  typia.assert(createdTag);

  // Verify created tag properties
  TestValidator.equals("content tag code matches", createdTag.code, tagCode);
  TestValidator.equals("content tag name matches", createdTag.name, tagName);
  TestValidator.equals(
    "content tag description matches",
    createdTag.description,
    tagDescription,
  );

  // 4. Retrieve the content tag details by ID
  const retrievedTag =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.atContentTag(
      connection,
      {
        id: createdTag.id,
      },
    );
  typia.assert(retrievedTag);

  // Validate retrieved tag matches created tag
  TestValidator.equals(
    "retrieved tag matches created tag",
    retrievedTag,
    createdTag,
  );

  // 5. Attempt retrieval with unauthorized access: unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.atContentTag(
      unauthenticatedConnection,
      { id: createdTag.id },
    );
  });

  // 6. Attempt retrieval of non-existent content tag ID
  await TestValidator.error(
    "retrieval of non-existent content tag should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.atContentTag(
        connection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
