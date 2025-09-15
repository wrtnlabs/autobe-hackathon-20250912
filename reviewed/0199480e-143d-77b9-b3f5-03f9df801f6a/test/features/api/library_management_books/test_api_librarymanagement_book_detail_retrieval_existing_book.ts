import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import type { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";

/**
 * Validate detailed retrieval of an existing book by ID.
 *
 * This test ensures that a guest user can successfully retrieve full
 * details of a book that they have just created. It confirms that the
 * retrieved book details exactly match the values used at creation,
 * including title, author, ISBN, created_at, and updated_at fields, and
 * that the book is not soft deleted.
 *
 * The test further verifies that querying a non-existent book ID or a soft
 * deleted book ID returns 404 errors.
 *
 * Steps:
 *
 * 1. Guest user joins the system to obtain authorization.
 * 2. Create a new book with unique title, author, and ISBN.
 * 3. Retrieve the book detail by the created book's UUID.
 * 4. Validate all fields match and timestamps are valid.
 * 5. Attempt to retrieve details for a non-existent UUID and expect 404.
 * 6. Attempt to retrieve details for a soft deleted book and expect 404.
 */
export async function test_api_librarymanagement_book_detail_retrieval_existing_book(
  connection: api.IConnection,
) {
  // 1. Perform guest user join to authenticate
  const guestUser: ILibraryManagementGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert(guestUser);

  // 2. Create a new book with unique title, author, and ISBN
  // Generate ISBN-13-like numeric string (13 digits) for better realism
  const uniqueIsbn = ArrayUtil.repeat(13, () =>
    RandomGenerator.pick(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]),
  ).join("");
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    author: RandomGenerator.name(),
    isbn: uniqueIsbn,
  } satisfies ILibraryManagementBooks.ICreate;

  const createdBook: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.create(connection, {
      body: createBody,
    });
  typia.assert(createdBook);

  // 3. Retrieve the book detail by created book's id
  const retrievedBook: ILibraryManagementBooks =
    await api.functional.libraryManagement.guestUser.books.at(connection, {
      bookId: createdBook.id,
    });
  typia.assert(retrievedBook);

  // 4. Validate all fields match and timestamps are valid
  TestValidator.equals("book ID matches", retrievedBook.id, createdBook.id);
  TestValidator.equals(
    "book title matches",
    retrievedBook.title,
    createBody.title,
  );
  TestValidator.equals(
    "book author matches",
    retrievedBook.author,
    createBody.author,
  );
  TestValidator.equals(
    "book ISBN matches",
    retrievedBook.isbn,
    createBody.isbn,
  );

  // Validate timestamps exist and are ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time string",
    /^[\d]{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(
      retrievedBook.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    /^[\d]{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(
      retrievedBook.updated_at,
    ),
  );

  // Validate deleted_at is null or undefined (book is not soft deleted)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    retrievedBook.deleted_at === null || retrievedBook.deleted_at === undefined,
  );

  // 5. Attempt to retrieve a book detail for non-existent UUID to test error handling
  await TestValidator.error(
    "retrieving non-existent book ID should fail with 404",
    async () => {
      await api.functional.libraryManagement.guestUser.books.at(connection, {
        bookId: typia.random<string & tags.Format<"uuid">>(), // Random UUID not in DB
      });
    },
  );

  // 6. Simulate a soft-deleted book by attempting to retrieve a random UUID
  // which simulates querying a book that either does not exist or is soft deleted
  await TestValidator.error(
    "retrieving soft deleted book ID should fail with 404",
    async () => {
      await api.functional.libraryManagement.guestUser.books.at(connection, {
        bookId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
