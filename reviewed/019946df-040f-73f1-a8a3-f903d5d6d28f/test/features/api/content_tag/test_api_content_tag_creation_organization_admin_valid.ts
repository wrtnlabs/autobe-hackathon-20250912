import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentTag";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Test scenario for validating content tag creation by an organization
 * admin.
 *
 * This test covers:
 *
 * 1. Registration of a new organization admin user with valid tenant ID and
 *    credentials.
 * 2. Authentication login request for the newly registered organization admin
 *    user.
 * 3. Creation of a content tag using the authenticated organization admin
 *    context with proper code, name, and optional description fields.
 * 4. Verification that the created content tag's properties match the creation
 *    request, including tenant ID correctness and UUID id format.
 * 5. Ensuring the organizational admin context authorizes creation and that
 *    returned tokens are valid.
 * 6. The test uses typia.assert for validation and TestValidator.equals for
 *    business logic checks.
 */
export async function test_api_content_tag_creation_organization_admin_valid(
  connection: api.IConnection,
) {
  // Step 1: Create a new organization admin user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const plaintextPassword = "ValidPassword123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const createAdminBody = {
    tenant_id: tenantId,
    email: adminEmail,
    password: plaintextPassword,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // Join new organization admin
  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(authorizedAdmin);

  TestValidator.equals(
    "joined admin tenant_id matches request",
    authorizedAdmin.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "joined admin email matches request",
    authorizedAdmin.email,
    adminEmail,
  );

  // Step 2: Login with the created organization admin
  const loginBody = {
    email: adminEmail,
    password: plaintextPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "logged-in admin tenant_id matches",
    loggedInAdmin.tenant_id,
    tenantId,
  );

  TestValidator.equals(
    "logged-in admin email matches",
    loggedInAdmin.email,
    adminEmail,
  );

  // Step 3: Create a content tag using the authenticated admin context
  const tagCode = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  })
    .replace(/\s+/g, "_")
    .toLowerCase();
  const tagName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 12,
  });
  const tagDescription = RandomGenerator.content({ paragraphs: 1 });

  const contentTagCreateBody = {
    code: tagCode,
    name: tagName,
    description: tagDescription,
  } satisfies IEnterpriseLmsContentTag.ICreate;

  const createdTag: IEnterpriseLmsContentTag =
    await api.functional.enterpriseLms.organizationAdmin.contentTags.createContentTag(
      connection,
      {
        body: contentTagCreateBody,
      },
    );
  typia.assert(createdTag);

  // Step 4: Verify properties of created tag
  TestValidator.predicate(
    "created content tag id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdTag.id,
    ),
  );

  TestValidator.equals(
    "created content tag code matches",
    createdTag.code,
    tagCode,
  );

  TestValidator.equals(
    "created content tag name matches",
    createdTag.name,
    tagName,
  );

  TestValidator.equals(
    "created content tag description matches",
    createdTag.description ?? null,
    tagDescription ?? null,
  );
}
