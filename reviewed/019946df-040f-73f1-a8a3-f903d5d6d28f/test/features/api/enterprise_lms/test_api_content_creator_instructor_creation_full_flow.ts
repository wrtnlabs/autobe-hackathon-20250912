import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_content_creator_instructor_creation_full_flow(
  connection: api.IConnection,
) {
  // 1. Join as organizationAdmin to create tenant and admin user
  const organizationAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!", // Plain text password for join
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joinedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(joinedAdmin);

  // 2. Create a new content creator instructor using authorized connection
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  // To simulate password_hash, generate a random alphaNumeric string
  const randomHashedPassword = RandomGenerator.alphaNumeric(64);

  const contentCreatorInstructorCreateBody = {
    tenant_id: joinedAdmin.tenant_id,
    email: creatorEmail,
    password_hash: randomHashedPassword,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const createdInstructor =
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: contentCreatorInstructorCreateBody,
      },
    );
  typia.assert(createdInstructor);

  // 3. Try to create duplicate content creator instructor with same email - expect error
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: contentCreatorInstructorCreateBody, // Reuse same email
      },
    );
  });

  // 4. Try to create with an invalid tenant_id (random UUID) - expect error
  const invalidTenantId = typia.random<string & tags.Format<"uuid">>();

  const invalidTenantCreateBody = {
    tenant_id: invalidTenantId,
    email: creatorEmail,
    password_hash: randomHashedPassword,
    first_name: contentCreatorInstructorCreateBody.first_name,
    last_name: contentCreatorInstructorCreateBody.last_name,
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  await TestValidator.error("invalid tenant id should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.contentcreatorinstructors.create(
      connection,
      {
        body: invalidTenantCreateBody,
      },
    );
  });
}
