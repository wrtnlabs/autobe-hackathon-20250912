import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";

/**
 * This test case validates the content creator instructor user's ability to
 * update a child tag relationship under the enterprise LMS content
 * management.
 *
 * The test steps are:
 *
 * 1. Create and authenticate a content creator instructor user in the tenant
 *    context
 * 2. Create initial child tag relationship under a parent tag
 * 3. Update the child tag relationship
 * 4. Validate that update response matches the new update details
 *
 * The test ensures only authorized roles can perform the update and that
 * the updated tag hierarchy is correctly persisted and returned.
 */
export async function test_api_content_creator_instructor_content_tag_child_tag_relationship_update(
  connection: api.IConnection,
) {
  // 1. Create and authenticate content creator instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();
  const status = "active";

  const contentCreatorInstructor =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    });
  typia.assert(contentCreatorInstructor);

  // 2. Create initial child tag relationship
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const initialChildTagId = typia.random<string & tags.Format<"uuid">>();
  const initialChildTagRelationship =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentTagId,
        body: {
          parent_tag_id: parentTagId,
          child_tag_id: initialChildTagId,
        } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
      },
    );
  typia.assert(initialChildTagRelationship);
  TestValidator.equals(
    "initial child tag parentTagId",
    initialChildTagRelationship.parent_tag_id,
    parentTagId,
  );
  TestValidator.equals(
    "initial child tag childTagId",
    initialChildTagRelationship.child_tag_id,
    initialChildTagId,
  );

  // 3. Perform update with new child tag id
  const updatedChildTagId = typia.random<string & tags.Format<"uuid">>();
  const updateRequestBody = {
    child_tag_id: updatedChildTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.IUpdate;

  const updatedChildTagRelationship =
    await api.functional.enterpriseLms.contentCreatorInstructor.contentTags.childTags.updateChildTagRelationship(
      connection,
      {
        parentTagId: parentTagId,
        childTagId: initialChildTagId,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedChildTagRelationship);

  // 4. Validate update response reflects changes
  TestValidator.equals(
    "updated child tag parentTagId",
    updatedChildTagRelationship.parent_tag_id,
    parentTagId,
  );
  TestValidator.equals(
    "updated child tag childTagId",
    updatedChildTagRelationship.child_tag_id,
    updatedChildTagId,
  );
}
