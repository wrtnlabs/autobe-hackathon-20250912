import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

export async function test_api_library_management_guestuser_book_delete_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as guest user and obtain tokens
  const guestAuthorized: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(guestAuthorized);

  // 2. Create a new book with required properties
  const createBookBody = {
    title: RandomGenerator.name(3),
    author: RandomGenerator.name(),
    isbn: `${RandomGenerator.alphaNumeric(3).toUpperCase()}-${RandomGenerator.alphaNumeric(7).toUpperCase()}`,
  } satisfies ILibraryManagementBooks.ICreate;

  const createdBook: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.create(connection, {
      body: createBookBody,
    });
  typia.assert(createdBook);

  TestValidator.predicate(
    "guest user token access exists",
    typeof guestAuthorized.token.access === "string" &&
      guestAuthorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "guest user token refresh exists",
    typeof guestAuthorized.token.refresh === "string" &&
      guestAuthorized.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "created book has valid UUID id",
    ((): boolean => {
      try {
        typia.assert<string & tags.Format<"uuid">>(createdBook.id);
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // 3. Delete the created book
  await api.functional.libraryManagement.guestUser.books.erase(connection, {
    bookId: createdBook.id,
  });

  // 4. Attempt to delete a non-existent or already deleted book to ensure error handling
  await TestValidator.error(
    "deleting non-existent or already deleted book should throw error",
    async () => {
      await api.functional.libraryManagement.guestUser.books.erase(connection, {
        bookId: createdBook.id,
      });
    },
  );

  await TestValidator.error(
    "deleting random non-existent book should throw error",
    async () => {
      const randomId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.libraryManagement.guestUser.books.erase(connection, {
        bookId: randomId,
      });
    },
  );
}
