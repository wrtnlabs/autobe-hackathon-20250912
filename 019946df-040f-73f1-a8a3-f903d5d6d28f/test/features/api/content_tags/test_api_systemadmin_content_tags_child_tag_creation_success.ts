import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This end-to-end test validates the complete successful workflow for a
 * system administrator to create a child tag association in the Enterprise
 * LMS system.
 *
 * Steps:
 *
 * 1. Create a system administrator account with valid info.
 * 2. Authenticate as that system administrator.
 * 3. Create a parent content tag hierarchy relationship by simulating tag
 *    creation.
 * 4. Create a separate child content tag hierarchy relationship.
 * 5. Associate child tag to parent tag by creating the hierarchical link.
 * 6. Verify that the response data is consistent and valid.
 * 7. Test that unauthorized users cannot create child tag associations.
 * 8. Test that attempting duplicate child tag relationships fails as expected.
 *
 * This test ensures correct multi-tenant isolation, authorization, data
 * consistency, and API integrity.
 */
export async function test_api_systemadmin_content_tags_child_tag_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a system administrator account using realistic data
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as the created system administrator
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedSystemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loggedSystemAdmin);

  // 3. Simulate parent tag creation by using two UUIDs as parent_tag_id and child_tag_id
  const parentUuid = typia.random<string & tags.Format<"uuid">>();
  const childUuid = typia.random<string & tags.Format<"uuid">>();

  // As there is no explicit endpoint to create pure tags, we simulate tag creation with createChildTag calls where parentTagId equals child_tag_id to mimic tag existence
  const parentTagCreation: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentUuid,
        body: {
          parent_tag_id: parentUuid,
          child_tag_id: parentUuid,
        } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
      },
    );
  typia.assert(parentTagCreation);

  // 4. Similarly, create a standalone child tag
  const childTagCreation: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: childUuid,
        body: {
          parent_tag_id: childUuid,
          child_tag_id: childUuid,
        } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
      },
    );
  typia.assert(childTagCreation);

  // 5. Now create the actual child tag relation between parent and child
  const childTagLink: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentUuid,
        body: {
          parent_tag_id: parentUuid,
          child_tag_id: childUuid,
        } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
      },
    );
  typia.assert(childTagLink);

  // 6. Validate the child tag relation data consistency
  TestValidator.equals(
    "parent_tag_id matches",
    childTagLink.parent_tag_id,
    parentUuid,
  );
  TestValidator.equals(
    "child_tag_id matches",
    childTagLink.child_tag_id,
    childUuid,
  );
  TestValidator.predicate(
    "valid created_at",
    typeof childTagLink.created_at === "string" &&
      childTagLink.created_at.length > 0,
  );

  // 7. Test unauthorized creation attempt (simulate unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized cannot create child tag",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
        unauthenticatedConn,
        {
          parentTagId: parentUuid,
          body: {
            parent_tag_id: parentUuid,
            child_tag_id: childUuid,
          } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
        },
      );
    },
  );

  // 8. Test duplicate child tag creation failure
  await TestValidator.error(
    "cannot create duplicate child tag relation",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: parentUuid,
          body: {
            parent_tag_id: parentUuid,
            child_tag_id: childUuid,
          } satisfies IEnterpriseLmsContentTagHierarchy.ICreate,
        },
      );
    },
  );
}
