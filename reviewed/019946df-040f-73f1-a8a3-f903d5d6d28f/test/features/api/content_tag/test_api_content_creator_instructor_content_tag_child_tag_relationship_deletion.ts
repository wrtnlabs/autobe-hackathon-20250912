import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

export async function test_api_content_creator_instructor_content_tag_child_tag_relationship_deletion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as content creator instructor user
  const auth: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `test_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password_hash: RandomGenerator.alphaNumeric(32),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(auth);

  // Step 2: Execute deletion of child tag relationship
  const parentTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const childTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call the API to erase the child tag relationship
  await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.eraseChildTagRelationship(
    connection,
    {
      parentTagId,
      childTagId,
    },
  );
}
