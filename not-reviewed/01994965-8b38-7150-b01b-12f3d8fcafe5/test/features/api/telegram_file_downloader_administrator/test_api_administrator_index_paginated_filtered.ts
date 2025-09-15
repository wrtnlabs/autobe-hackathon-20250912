import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Validate retrieval of paginated and filtered administrator list with
 * authorization.
 *
 * This test creates an administrator account, authenticates, and verifies
 * the ability to retrieve the administrators list with various filters. It
 * tests successful retrieval and basic pagination properties. Unauthorized
 * access is also tested.
 *
 * Steps:
 *
 * 1. Create and authenticate administrator.
 * 2. Retrieve administrator list with no filters.
 * 3. Retrieve administrator list filtered by email.
 * 4. Retrieve administrator list filtered by created_at as null.
 * 5. Retrieve administrator list filtered by created_at as a specific date.
 * 6. Validate pagination and administrator properties in each response.
 * 7. Test unauthorized access by attempting retrieval without authentication.
 */
export async function test_api_administrator_index_paginated_filtered(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(12); // Representing a hashed password

  const administrator: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Retrieve administrator list with no filters
  {
    const response =
      await api.functional.telegramFileDownloader.administrator.administrators.index(
        connection,
        { body: {} satisfies ITelegramFileDownloaderAdministrator.IRequest },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination numbers non-negative",
      response.pagination.current >= 0 &&
        response.pagination.limit >= 0 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );
    for (const admin of response.data) {
      typia.assert(admin);
    }
  }

  // Step 3: Retrieve administrator list filtered by email
  {
    const response =
      await api.functional.telegramFileDownloader.administrator.administrators.index(
        connection,
        {
          body: {
            email: administrator.email,
          } satisfies ITelegramFileDownloaderAdministrator.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      "all administrators' emails match filter",
      response.data.every((admin) => admin.email === administrator.email),
    );
  }

  // Step 4: Retrieve administrator list filtered by created_at = null
  {
    const response =
      await api.functional.telegramFileDownloader.administrator.administrators.index(
        connection,
        {
          body: {
            created_at: null,
          } satisfies ITelegramFileDownloaderAdministrator.IRequest,
        },
      );
    typia.assert(response);
  }

  // Step 5: Retrieve administrator list filtered by a specific created_at date
  {
    const specificDate = administrator.created_at;
    const response =
      await api.functional.telegramFileDownloader.administrator.administrators.index(
        connection,
        {
          body: {
            created_at: specificDate,
          } satisfies ITelegramFileDownloaderAdministrator.IRequest,
        },
      );
    typia.assert(response);
  }

  // Step 6: Test unauthorized access (simulate unauthenticated connection)
  {
    const unauthenticatedConnection: api.IConnection = {
      ...connection,
      headers: {},
    };
    await TestValidator.error("unauthorized access should fail", async () => {
      await api.functional.telegramFileDownloader.administrator.administrators.index(
        unauthenticatedConnection,
        { body: {} satisfies ITelegramFileDownloaderAdministrator.IRequest },
      );
    });
  }
}
