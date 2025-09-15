import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * This test ensures that an admin user can retrieve detailed information about
 * a specific UI page theme by its unique ID. It covers the full flow:
 * registering and authenticating an admin, creating a page theme, and
 * retrieving it by ID.
 *
 * The test validates that the retrieved data matches the created page theme's
 * attributes, including name, description, and timestamps. It also ensures type
 * safety and API response correctness via typia assertions and TestValidator
 * checks.
 */
export async function test_api_flexoffice_admin_pagetheme_retrieve_valid_id(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Authenticate as the created admin to obtain fresh tokens
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Step 3: Create a new UI page theme
  const pageThemeCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 10,
      wordMax: 15,
    }),
  } satisfies IFlexOfficePageTheme.ICreate;

  const createdPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.create(connection, {
      body: pageThemeCreateBody,
    });
  typia.assert(createdPageTheme);

  // Step 4: Retrieve the page theme by its ID
  const retrievedPageTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.admin.pageThemes.at(connection, {
      pageThemeId: createdPageTheme.id,
    });
  typia.assert(retrievedPageTheme);

  // Step 5: Validate the retrieved page theme matches the created data
  TestValidator.equals(
    "retrieved page theme id equals created id",
    retrievedPageTheme.id,
    createdPageTheme.id,
  );

  TestValidator.equals(
    "retrieved page theme name equals created name",
    retrievedPageTheme.name,
    createdPageTheme.name,
  );

  TestValidator.equals(
    "retrieved page theme description equals created description",
    retrievedPageTheme.description ?? null,
    createdPageTheme.description ?? null,
  );

  TestValidator.equals(
    "retrieved page theme created_at equals created created_at",
    retrievedPageTheme.created_at,
    createdPageTheme.created_at,
  );

  TestValidator.equals(
    "retrieved page theme updated_at equals created updated_at",
    retrievedPageTheme.updated_at,
    createdPageTheme.updated_at,
  );
}
