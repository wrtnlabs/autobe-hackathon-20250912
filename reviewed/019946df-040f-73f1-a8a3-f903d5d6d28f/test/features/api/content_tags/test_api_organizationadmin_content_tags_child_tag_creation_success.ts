import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTagHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTagHierarchy";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This End-to-End test verifies the creation of parent and child content tags
 * and the hierarchical linkage between them by an organization administrator.
 * It follows a realistic flow of tenant-aware organization administrator
 * registration, login, content tag creations, relationship establishment,
 * duplicate prevention, cross-tenant security enforcement, error scenarios, and
 * validation of final hierarchical data.
 */
export async function test_api_organizationadmin_content_tags_child_tag_creation_success(
  connection: api.IConnection,
) {
  // 1. Register an organization admin for tenant A
  const tenantAId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "SecurePass123!";
  const adminCreateBody = {
    tenant_id: tenantAId,
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const adminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to refresh token and authentication context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const adminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Generate fake content tag uuids for parent and child
  const parentTagId = typia.random<string & tags.Format<"uuid">>();
  const childTagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create the child tag hierarchy relationship: link childTagId to parentTagId
  const createChildTagBody = {
    parent_tag_id: parentTagId,
    child_tag_id: childTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  const relation: IEnterpriseLmsContentTagHierarchy =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
      connection,
      {
        parentTagId: parentTagId,
        body: createChildTagBody,
      },
    );
  typia.assert(relation);

  TestValidator.equals(
    "parentTagId in relation",
    relation.parent_tag_id,
    parentTagId,
  );
  TestValidator.equals(
    "childTagId in relation",
    relation.child_tag_id,
    childTagId,
  );

  // 4. Attempt to create the same child tag relationship again to confirm duplicate rejection
  await TestValidator.error(
    "duplicate child tag hierarchy creation should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: parentTagId,
          body: createChildTagBody,
        },
      );
    },
  );

  // 5. Register another organization admin for tenant B (different tenant) to validate cross-tenant linkage rejection
  const tenantBId = typia.random<string & tags.Format<"uuid">>();
  const adminBEmail = `adminB+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminBPassword = "SecurePass123!";
  const adminBCreateBody = {
    tenant_id: tenantBId,
    email: adminBEmail,
    password: adminBPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  await api.functional.auth.organizationAdmin.join(connection, {
    body: adminBCreateBody,
  });

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // Attempt to create relation with parentTagId from tenant A but childTagId (random new UUID) from tenant B's context
  const crossTenantChildTagId = typia.random<string & tags.Format<"uuid">>();
  const crossTenantRelationBody = {
    parent_tag_id: parentTagId,
    child_tag_id: crossTenantChildTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  await TestValidator.error(
    "cross-tenant child tag hierarchy creation should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: parentTagId,
          body: crossTenantRelationBody,
        },
      );
    },
  );

  // 6. Test error responses for invalid parentTagId and invalid child_tag_id
  // invalid parentTagId
  const invalidParentTagId = "00000000-0000-0000-0000-000000000000"; // UUID all zeros
  const validChildTagIdForInvalidParent = typia.random<
    string & tags.Format<"uuid">
  >();
  const invalidParentBody = {
    parent_tag_id: invalidParentTagId,
    child_tag_id: validChildTagIdForInvalidParent,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  await TestValidator.error(
    "invalid parentTagId should cause error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: invalidParentTagId,
          body: invalidParentBody,
        },
      );
    },
  );

  // invalid child_tag_id
  const validParentTagIdForInvalidChild = typia.random<
    string & tags.Format<"uuid">
  >();
  const invalidChildTagId = "00000000-0000-0000-0000-000000000000"; // UUID all zeros
  const invalidChildBody = {
    parent_tag_id: validParentTagIdForInvalidChild,
    child_tag_id: invalidChildTagId,
  } satisfies IEnterpriseLmsContentTagHierarchy.ICreate;

  await TestValidator.error(
    "invalid child_tag_id should cause error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.contentTags.childTags.createChildTag(
        connection,
        {
          parentTagId: validParentTagIdForInvalidChild,
          body: invalidChildBody,
        },
      );
    },
  );

  // 7. Confirmation of final hierarchical relation consistency already done with typia.assert on the successful relation creation
}
