import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_orgadmin_content_tag_child_tag_relationship_update(
  connection: api.IConnection,
) {
  // 1. Organization admin signs up
  const orgAdminBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: RandomGenerator.name(1) + "@organization.com",
    password: "securePass123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminBody,
    });
  typia.assert(orgAdmin);

  // 2. Create parent and child content tags by generating UUIDs
  // Note: The scenario did not provide APIs for creating content tags themselves,
  // so we use random UUIDs as placeholders for existing tags in this tenant
  const parentTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const childTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create child tag relationship under parent tag
  const childTagCreateBody: IEnterpriseLmsContentTagHierarchy.ICreate = {
    parent_tag_id: parentTagId,
    child_tag_id: childTagId,
  };

  const createdRelationship: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentTagId,
        body: childTagCreateBody,
      },
    );
  typia.assert(createdRelationship);

  // 4. Update the child tag relationship - simulate updating child_tag_id to a new value
  const newChildTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody: IEnterpriseLmsContentTagHierarchy.IUpdate = {
    child_tag_id: newChildTagId,
  };

  const updatedRelationship: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.updateChildTagRelationship(
      connection,
      {
        parentTagId: parentTagId,
        childTagId: childTagId,
        body: updateBody,
      },
    );
  typia.assert(updatedRelationship);
  TestValidator.equals(
    "updated child_tag_id",
    updatedRelationship.child_tag_id,
    newChildTagId,
  );

  // 5. Test unauthorized update attempt - creating unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized user cannot update child tag relationship",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.updateChildTagRelationship(
        unauthenticatedConnection,
        {
          parentTagId: parentTagId,
          childTagId: childTagId,
          body: updateBody,
        },
      );
    },
  );

  // Additional tenant scoping and access control tests require multi-tenant backend setup, out of scope.
}
