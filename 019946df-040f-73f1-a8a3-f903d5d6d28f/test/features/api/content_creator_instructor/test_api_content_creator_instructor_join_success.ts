import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This test validates the complete registration flow of a content creator
 * or instructor user under a tenant organization.
 *
 * The workflow includes:
 *
 * 1. System administrator registration and authentication.
 * 2. Tenant organization creation under the system.
 * 3. Content creator/instructor registration with valid tenant ID.
 * 4. Validation of the returned user data and authorization tokens.
 * 5. Assertion that duplicate email registration fails appropriately.
 *
 * It ensures compliance with business rules such as unique email per
 * tenant, default active status assignment, and secure password hashing.
 *
 * All asynchronous operations are awaited, with strict type assertion and
 * validation.
 */
export async function test_api_content_creator_instructor_join_success(
  connection: api.IConnection,
) {
  // 1. System administrator joins
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = RandomGenerator.alphaNumeric(64);
  const systemAdminCreateBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreateBody,
  });
  typia.assert(systemAdmin);

  // 2. System administrator logs in
  const systemAdminLoginBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: systemAdminLoginBody,
    },
  );
  typia.assert(systemAdminLogin);

  // 3. System administrator creates a tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: tenantCreateBody,
    },
  );
  typia.assert(tenant);

  // 4. Content creator/instructor joins with tenantId
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const contentCreatorCreateBody = {
    tenant_id: tenant.id satisfies string as string,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreateBody,
    });
  typia.assert(contentCreator);

  TestValidator.equals(
    "tenant_id matches",
    contentCreator.tenant_id,
    contentCreatorCreateBody.tenant_id,
  );
  TestValidator.equals("email matches", contentCreator.email, email);
  TestValidator.equals(
    "first_name matches",
    contentCreator.first_name,
    firstName,
  );
  TestValidator.equals("last_name matches", contentCreator.last_name, lastName);
  TestValidator.equals("status is active", contentCreator.status, "active");
  TestValidator.predicate(
    "id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contentCreator.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contentCreator.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contentCreator.updated_at),
  );
  TestValidator.equals("deleted_at is null", contentCreator.deleted_at, null);

  // Assert token structure
  TestValidator.predicate(
    "token.access is string",
    typeof contentCreator.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof contentCreator.token.refresh === "string",
  );
  TestValidator.predicate(
    "token.expired_at is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contentCreator.token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      contentCreator.token.refreshable_until,
    ),
  );

  // 5. Attempt to register another content creator with the same email under the same tenant - expect failure
  const duplicateContentCreatorCreateBody = {
    tenant_id: tenant.id,
    email: email, // duplicate email
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: duplicateContentCreatorCreateBody,
    });
  });
}
