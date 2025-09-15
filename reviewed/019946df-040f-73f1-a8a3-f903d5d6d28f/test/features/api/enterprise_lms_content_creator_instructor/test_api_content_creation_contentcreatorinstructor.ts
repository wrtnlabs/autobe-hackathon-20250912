import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsContents } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContents";

/**
 * End-to-End test: Enterprise LMS content creation by Content
 * Creator/Instructor.
 *
 * This test verifies the entire creation workflow of content by an authorized
 * Content Creator/Instructor user within a multi-tenant Enterprise LMS system.
 * It covers user registration, login, tenant association, content creation, and
 * validation of unique title constraints.
 *
 * Steps:
 *
 * 1. Register a new Content Creator/Instructor user for a generated tenant.
 * 2. Login as the newly created user.
 * 3. Create a new content item under the tenant with unique title.
 * 4. Validate content metadata and timestamps.
 * 5. Validate rejection of duplicate content title on create.
 * 6. Validate unauthorized requests are rejected.
 */
export async function test_api_content_creation_contentcreatorinstructor(
  connection: api.IConnection,
) {
  // 1. Prepare a tenant UUID
  const tenant_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register new Content Creator/Instructor user
  const passwordRaw = RandomGenerator.alphaNumeric(12);
  const passwordHash = passwordRaw; // Assumption: raw password submitted as hash in test environment
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const email = `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@example.com`;
  const status = "active";

  const joinBody = {
    tenant_id,
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const user: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 3. Login as the registered user
  const loginBody = {
    email,
    password: passwordRaw,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedInUser: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Validate tenant consistency
  TestValidator.equals(
    "tenant_id consistency",
    loggedInUser.tenant_id,
    tenant_id,
  );

  // 4. Create new content item with unique title
  const contentTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const contentDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 8,
    wordMax: 15,
  });
  const contentType = "video"; // example valid content type
  const statusContent = "draft";
  const businessStatus = "active";

  const contentCreateBody = {
    tenant_id,
    title: contentTitle,
    description: contentDescription,
    content_type: contentType,
    status: statusContent,
    business_status: businessStatus,
  } satisfies IEnterpriseLmsContents.ICreate;

  const createdContent: IEnterpriseLmsContents =
    await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
      connection,
      { body: contentCreateBody },
    );
  typia.assert(createdContent);

  // Validate tenant association
  TestValidator.equals(
    "content tenant_id",
    createdContent.tenant_id,
    tenant_id,
  );

  // Validate content title and other metadata
  TestValidator.equals("content title", createdContent.title, contentTitle);
  TestValidator.equals(
    "content description",
    createdContent.description,
    contentDescription,
  );
  TestValidator.equals(
    "content type",
    createdContent.content_type,
    contentType,
  );
  TestValidator.equals("content status", createdContent.status, statusContent);
  TestValidator.equals(
    "content business status",
    createdContent.business_status,
    businessStatus,
  );

  // Validate created and updated timestamps to be ISO date-time string
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof createdContent.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        createdContent.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof createdContent.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        createdContent.updated_at,
      ),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdContent.deleted_at === null ||
      createdContent.deleted_at === undefined,
  );

  // 5. Attempt to create duplicate content title under the same tenant
  const duplicateContentBody = { ...contentCreateBody };

  await TestValidator.error(
    "duplicate content title creation should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
        connection,
        { body: duplicateContentBody },
      );
    },
  );

  // 6. Attempt unauthorized content creation without login
  // Create a fresh connection without Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized content creation should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.contents.create(
        unauthenticatedConnection,
        { body: contentCreateBody },
      );
    },
  );
}
