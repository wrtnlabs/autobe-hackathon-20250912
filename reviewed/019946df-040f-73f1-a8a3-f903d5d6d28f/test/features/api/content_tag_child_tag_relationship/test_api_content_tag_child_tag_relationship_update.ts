import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This E2E test validates updating the child tag relationship under a
 * parent content tag. It includes system admin authentication, creating a
 * child tag relationship, updating it, and verifying the update. It ensures
 * only valid updates occur and responses match expected schema.
 *
 * Steps:
 *
 * 1. System admin signs up and authenticates
 * 2. Create a child content tag relationship under a parent tag
 * 3. Update the child tag relationship and assert results
 * 4. Validation of updated fields reflecting the changes
 *
 * Error case tests (unauthorized update, invalid IDs) are omitted due to
 * insufficient API coverage.
 */
export async function test_api_content_tag_child_tag_relationship_update(
  connection: api.IConnection,
) {
  // 1. System admin sign up and authenticate
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a child content tag relationship under a parent tag
  // For test, generate random parent and child tag IDs
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  // Create the child tag relationship
  const createdChildTagRelation: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentTagId,
        body: {
          parent_tag_id: parentTagId,
          child_tag_id: childTagId,
        } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
      },
    );
  typia.assert(createdChildTagRelation);

  // 3. Prepare update data for child tag relationship
  // Here setting parent_tag_id to null to remove the current reference.
  // Update child_tag_id to a new random UUID.
  const newChildTagId = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    parent_tag_id: null,
    child_tag_id: newChildTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.IUpdate;

  // 4. Update the child tag relationship
  const updatedChildTagRelation: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.updateChildTagRelationship(
      connection,
      {
        parentTagId: parentTagId,
        childTagId: createdChildTagRelation.child_tag_id,
        body: updateBody,
      },
    );
  typia.assert(updatedChildTagRelation);

  // 5. Validate that the update is reflected
  TestValidator.equals(
    "parent_tag_id should be null after update",
    updatedChildTagRelation.parent_tag_id,
    updateBody.parent_tag_id,
  );
  TestValidator.equals(
    "child_tag_id should be updated",
    updatedChildTagRelation.child_tag_id,
    updateBody.child_tag_id,
  );
}
