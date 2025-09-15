import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

export async function test_api_guestuser_join_creation_success(
  connection: api.IConnection,
) {
  // 1. Call the guest user join API (no body parameters) to create a temporary guest user
  const authorizedGuestUser: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(authorizedGuestUser);

  // 2. Validate the id is a UUID formatted string
  TestValidator.predicate(
    "guest user id is valid UUID",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      authorizedGuestUser.id,
    ),
  );

  // 3. Validate the created_at and updated_at are present and are date-time strings
  TestValidator.predicate(
    "created_at is date-time string",
    !isNaN(Date.parse(authorizedGuestUser.created_at)),
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    !isNaN(Date.parse(authorizedGuestUser.updated_at)),
  );

  // 4. The deleted_at is optional and might be null or undefined; if present, it must be a date-time string or null
  if (
    authorizedGuestUser.deleted_at !== undefined &&
    authorizedGuestUser.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is date-time string if present",
      !isNaN(Date.parse(authorizedGuestUser.deleted_at)),
    );
  }

  // 5. Validate that the token object exists and all token fields are non-empty strings and correctly formatted date-time strings
  const token = authorizedGuestUser.token;
  TestValidator.predicate(
    "token.access is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is date-time string",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is date-time string",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
